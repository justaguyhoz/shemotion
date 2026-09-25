import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  claimContactNotification,
  createManualContact,
  markContactNotification,
  sourcePlatformForAttribution,
  storeContactSubmission,
  validateContactAdminInput,
  validateEnquiryAdminInput,
  validateManualContactInput,
} from "../shared/contacts.js";
import { processContactCreateRequest, processContactsListRequest } from "../functions/api/admin/contacts/index.js";
import { MARKETING_CONSENT_TEXT, MARKETING_CONSENT_VERSION } from "../shared/contact.js";
import { verifyAccessRequest } from "../shared/access.js";
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
  sourcePlatform: "google_ads",
  referrerUrl: "",
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

test("source migration adds stable contact and enquiry acquisition fields", async () => {
  const sql = await fs.readFile(new URL("../migrations/0009_add_contact_sources.sql", import.meta.url), "utf8");
  assert.match(sql, /ADD COLUMN first_source_platform/i);
  assert.match(sql, /ADD COLUMN source_platform/i);
  assert.match(sql, /ADD COLUMN notification_required/i);
  assert.match(sql, /CREATE VIEW current_marketing_contacts/i);
});

test("acquisition classification distinguishes paid, organic, direct, referral and unknown evidence", () => {
  assert.equal(sourcePlatformForAttribution({ utmSource: "google", utmMedium: "cpc" }), "google_ads");
  assert.equal(sourcePlatformForAttribution({ referrerUrl: "https://www.google.com/search" }), "google_organic");
  assert.equal(sourcePlatformForAttribution({ utmSource: "facebook", utmMedium: "paid_social" }), "facebook_ads");
  assert.equal(sourcePlatformForAttribution({ referrerUrl: "https://facebook.com/shemotion" }), "facebook_organic");
  assert.equal(sourcePlatformForAttribution({ utmSource: "instagram", utmCampaign: "ads_launch" }), "instagram_ads");
  assert.equal(sourcePlatformForAttribution({ referrerUrl: "https://instagram.com/shemotion.au" }), "instagram_organic");
  assert.equal(sourcePlatformForAttribution({ utmSource: "facebook" }), "unknown");
  assert.equal(sourcePlatformForAttribution({}), "direct");
  assert.equal(sourcePlatformForAttribution({ referrerUrl: "https://example.org/article" }), "referral");
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
  assert.equal(db.contacts[0].first_source_platform, "google_ads");
  assert.equal(db.contacts[0].first_utm_campaign, "spring");
  assert.equal(db.contacts[0].last_activity_at, "2026-09-25T01:00:00.000Z");
  assert.equal(db.contacts[0].contact_type, "hr_people_culture");
  assert.equal(db.enquiries[1].utm_campaign, "workplace");
  assert.equal(db.enquiries[1].source_platform, "google_ads");
});

test("later enquiries preserve first-touch source while recording their own source", async () => {
  const db = new MemoryContactsDb();
  await storeContactSubmission(db, basePayload, firstAttribution, "2026-09-25T00:00:00.000Z");
  await storeContactSubmission(db, { ...basePayload, submissionId: "99999999-9999-4999-8999-999999999999" }, {
    ...firstAttribution, sourcePlatform: "direct", utmSource: "", utmMedium: "", utmCampaign: "",
  }, "2026-09-25T01:00:00.000Z");
  assert.equal(db.contacts[0].first_source_platform, "google_ads");
  assert.equal(db.enquiries[1].source_platform, "direct");
});

test("manual contacts support normalized email, source selection, historical dates and optional enquiries", async () => {
  const db = new MemoryContactsDb();
  const validated = validateManualContactInput({
    firstName: " Ava ", lastName: " Example ", email: " AVA@EXAMPLE.COM ", phone: "",
    contactType: "event_organiser", sourcePlatform: "event", source: "Gold Coast event",
    originalContactAt: "2026-08-01T03:00:00.000Z", adminNotes: "Historic contact\nVerified from records.",
    includeEnquiry: true, enquiryType: "Private group or retreat", message: "First line\nSecond line",
    enquiryAt: "2026-08-02T04:00:00.000Z", enquirySource: "Event follow-up", enquiryAdminNotes: "Phone note",
  }, new Date("2026-09-25T00:00:00.000Z"));
  const created = await createManualContact(db, validated, () => "manual-id");
  assert.equal(created.contactId, 1);
  assert.equal(db.contacts[0].email_normalized, "ava@example.com");
  assert.equal(db.contacts[0].first_source_platform, "event");
  assert.equal(db.contacts[0].first_contact_at, "2026-08-01T03:00:00.000Z");
  assert.equal(db.contacts[0].last_activity_at, "2026-08-02T04:00:00.000Z");
  assert.ok(new Date(db.contacts[0].created_at) > new Date("2026-08-02T04:00:00.000Z"));
  assert.equal(db.enquiries.length, 1);
  assert.equal(db.enquiries[0].message, "First line\nSecond line");
  assert.equal(db.enquiries[0].notification_required, 0);
  assert.equal(db.consents.length, 0);
});

test("manual contact can be created without an enquiry and duplicate email returns the existing record", async () => {
  const db = new MemoryContactsDb();
  const input = validateManualContactInput({
    firstName: "Ava", lastName: "Example", email: "ava@example.com", contactType: "consumer",
    sourcePlatform: "unknown", includeEnquiry: false,
  }, new Date("2026-09-25T00:00:00.000Z"));
  await createManualContact(db, input);
  assert.equal(db.enquiries.length, 0);
  const response = await processContactCreateRequest({
    request: new Request("https://shemotion.com.au/api/admin/contacts", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ firstName: "Other", lastName: "Name", email: " AVA@EXAMPLE.COM ", contactType: "consumer" }),
    }), env: { DB: db },
  });
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: "A contact with this email already exists.", existingContactId: 1 });
  assert.equal(db.contacts.length, 1);
});

test("manual contact validation rejects invalid fields and never accepts implied consent", () => {
  assert.throws(() => validateManualContactInput({ firstName: "A", lastName: "B", email: "bad", contactType: "consumer" }));
  assert.throws(() => validateManualContactInput({ firstName: "A", lastName: "B", email: "a@example.com", contactType: "owner" }));
  assert.throws(() => validateManualContactInput({ firstName: "A", lastName: "B", email: "a@example.com", contactType: "consumer", sourcePlatform: "facebook" }));
  const result = validateManualContactInput({ firstName: "A", lastName: "B", email: "a@example.com", contactType: "consumer", marketingConsent: true });
  assert.equal("marketingConsent" in result, false);
});

test("unauthenticated Contacts API creation is rejected by the shared admin guard", async () => {
  const result = await verifyAccessRequest({
    request: new Request("https://shemotion.com.au/api/admin/contacts", { method: "POST" }),
    env: {
      ACCESS_TEAM_DOMAIN: "https://example.cloudflareaccess.com",
      ACCESS_AUD: "audience",
      ADMIN_EMAILS: "shemotion.au@gmail.com",
    },
  });
  assert.equal(result.response.status, 401);
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
  }), { firstName: "Casey", lastName: "Visitor", phone: "+61 400 000 000", contactType: "consumer", status: "active", adminNotes: "" });
  assert.deepEqual(validateEnquiryAdminInput({ status: "replied", adminNotes: " Followed up. ", ignored: "discarded" }), {
    status: "replied", adminNotes: "Followed up.",
  });
  assert.throws(() => validateContactAdminInput({ firstName: "Casey", contactType: "owner", status: "active" }));
  assert.throws(() => validateEnquiryAdminInput({ status: "deleted", adminNotes: "" }));
});

test("contacts list applies parameterized search, type, status, source and consent filters", async () => {
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
    request: new Request("https://shemotion.com.au/api/admin/contacts?search=Casey&type=consumer&status=active&sourcePlatform=google_ads&marketing=subscribed&sort=name"),
    env,
  });
  assert.equal(response.status, 200);
  assert.match(preparedSql, /c\.contact_type = \?/);
  assert.match(preparedSql, /c\.status = \?/);
  assert.match(preparedSql, /c\.first_source_platform = \?/);
  assert.match(preparedSql, /latest\.status = 'granted'/);
  assert.match(preparedSql, /LIKE \? ESCAPE/);
  assert.match(preparedSql, /ORDER BY c\.first_name COLLATE NOCASE/);
  assert.deepEqual(boundValues, ["consumer", "active", "google_ads", "%Casey%", "%Casey%", "%casey%"]);
});
