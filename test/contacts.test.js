import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  claimContactNotification,
  markContactNotification,
  storeContactSubmission,
  validateContactAdminInput,
  validateEnquiryAdminInput,
} from "../shared/contacts.js";
import { processContactsListRequest } from "../functions/api/admin/contacts/index.js";
import { MARKETING_CONSENT_TEXT, MARKETING_CONSENT_VERSION } from "../shared/contact.js";
import { MemoryContactsDb } from "./helpers/memory-contacts-db.js";

const basePayload = {
  name: "Casey Visitor",
  email: "casey@example.com",
  phone: "",
  interestCategory: "Upcoming event or booking",
  message: "Please share the next event.",
  marketingConsent: false,
  submissionId: "11111111-1111-4111-8111-111111111111",
};

const firstAttribution = {
  source: "website_contact_form",
  sourceUrl: "https://shemotion.com.au/for-organisations/?ignored=yes",
  utmSource: "google",
  utmMedium: "cpc",
  utmCampaign: "spring",
  utmContent: "",
  utmTerm: "women wellness",
};

test("CRM migration defines contacts, enquiries, consent history and an active-consent view", async () => {
  const sql = await fs.readFile(new URL("../migrations/0008_create_contacts_crm.sql", import.meta.url), "utf8");
  assert.match(sql, /CREATE TABLE contacts/i);
  assert.match(sql, /CREATE UNIQUE INDEX idx_contacts_email_normalized/i);
  assert.match(sql, /CREATE TABLE enquiries/i);
  assert.match(sql, /CREATE TABLE contact_consents/i);
  assert.match(sql, /CREATE VIEW current_marketing_contacts/i);
  assert.match(sql, /latest\.status = 'granted'/i);
});

test("repeated normalized email creates one contact, two enquiries and preserves first-touch attribution", async () => {
  const db = new MemoryContactsDb();
  await storeContactSubmission(db, basePayload, firstAttribution, "2026-09-25T00:00:00.000Z");
  await storeContactSubmission(db, {
    ...basePayload,
    name: "Casey Updated",
    email: "casey@example.com",
    phone: "+61 400 000 000",
    interestCategory: "Workplace or organisation",
    message: "A workplace enquiry.",
    submissionId: "22222222-2222-4222-8222-222222222222",
  }, {
    ...firstAttribution,
    sourceUrl: "https://shemotion.com.au/private-groups-retreats/",
    utmCampaign: "workplace",
  }, "2026-09-25T01:00:00.000Z");

  assert.equal(db.contacts.length, 1);
  assert.equal(db.enquiries.length, 2);
  assert.equal(db.contacts[0].first_source_url, firstAttribution.sourceUrl);
  assert.equal(db.contacts[0].first_utm_campaign, "spring");
  assert.equal(db.contacts[0].last_activity_at, "2026-09-25T01:00:00.000Z");
  assert.equal(db.contacts[0].contact_type, "hr_people_culture");
  assert.equal(db.enquiries[1].utm_campaign, "workplace");
});

test("unchecked marketing option creates no consent and checked option records exact evidence", async () => {
  const db = new MemoryContactsDb();
  await storeContactSubmission(db, basePayload, firstAttribution, "2026-09-25T00:00:00.000Z");
  assert.equal(db.consents.length, 0);

  await storeContactSubmission(db, {
    ...basePayload,
    marketingConsent: true,
    submissionId: "33333333-3333-4333-8333-333333333333",
  }, firstAttribution, "2026-09-25T02:00:00.000Z");
  assert.equal(db.consents.length, 1);
  assert.deepEqual(db.consents[0], {
    id: 1,
    submission_id: "33333333-3333-4333-8333-333333333333",
    contact_id: 1,
    consent_type: "marketing_email",
    status: "granted",
    source: "website_contact_form",
    consent_text: MARKETING_CONSENT_TEXT,
    consent_version: MARKETING_CONSENT_VERSION,
    recorded_at: "2026-09-25T02:00:00.000Z",
  });
});

test("submission idempotency and notification claiming prevent duplicate email sends", async () => {
  const db = new MemoryContactsDb();
  await storeContactSubmission(db, basePayload, firstAttribution);
  await storeContactSubmission(db, basePayload, firstAttribution);
  assert.equal(db.enquiries.length, 1);
  assert.equal(await claimContactNotification(db, basePayload.submissionId), "send");
  assert.equal(await claimContactNotification(db, basePayload.submissionId), "processing");
  await markContactNotification(db, basePayload.submissionId, "sent");
  assert.equal(await claimContactNotification(db, basePayload.submissionId), "sent");
});

test("admin update validation allowlists contact and enquiry fields", () => {
  assert.deepEqual(validateContactAdminInput({
    firstName: " Casey ", lastName: "Visitor", phone: "+61 400 000 000",
    contactType: "consumer", status: "active", ignored: "discarded",
  }), { firstName: "Casey", lastName: "Visitor", phone: "+61 400 000 000", contactType: "consumer", status: "active" });
  assert.deepEqual(validateEnquiryAdminInput({ status: "replied", adminNotes: " Followed up. ", ignored: "discarded" }), {
    status: "replied", adminNotes: "Followed up.",
  });
  assert.throws(() => validateContactAdminInput({ firstName: "Casey", contactType: "owner", status: "active" }));
  assert.throws(() => validateEnquiryAdminInput({ status: "deleted", adminNotes: "" }));
});

test("contacts list applies parameterized search, type, status and consent filters", async () => {
  let preparedSql = "";
  let boundValues = [];
  const env = { DB: { prepare(sql) {
    preparedSql = sql;
    return {
      bind(...values) { boundValues = values; return this; },
      async all() { return { results: [] }; },
    };
  } } };
  const response = await processContactsListRequest({
    request: new Request("https://shemotion.com.au/api/admin/contacts?search=Casey&type=consumer&status=active&marketing=subscribed&sort=name"),
    env,
  });
  assert.equal(response.status, 200);
  assert.match(preparedSql, /c\.contact_type = \?/);
  assert.match(preparedSql, /c\.status = \?/);
  assert.match(preparedSql, /latest\.status = 'granted'/);
  assert.match(preparedSql, /LIKE \? ESCAPE/);
  assert.match(preparedSql, /ORDER BY c\.first_name COLLATE NOCASE/);
  assert.deepEqual(boundValues, ["consumer", "active", "%Casey%", "%Casey%", "%casey%"]);
});
