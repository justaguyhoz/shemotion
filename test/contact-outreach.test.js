import test from "node:test";
import assert from "node:assert/strict";
import { validateContactInput } from "../shared/contact.js";
import { sanitizeOutreachSnapshot } from "../shared/outreach.js";
import { processContactRequest } from "../functions/api/contact.js";
import { processOutreachRequest } from "../functions/api/admin/outreach.js";
import { filterSnapshot, periodBounds, recordActivityDate, summarise } from "../admin/outreach/outreach.js";
import { MemoryContactsDb } from "./helpers/memory-contacts-db.js";

const URL = "https://script.google.com/macros/s/example/exec";
const CONTACT_TOKEN = "c".repeat(32);
const OUTREACH_TOKEN = "o".repeat(32);

test("contact validation allowlists fields and rejects invalid categories", () => {
  const result = validateContactInput({
    name: " Test Visitor ",
    email: "TEST@EXAMPLE.COM",
    phone: "+61 400 000 000",
    interestCategory: "Something else",
    message: "A controlled test enquiry.",
    marketingConsent: false,
    submissionId: "",
    sourcePath: "",
    utmSource: "",
    utmMedium: "",
    utmCampaign: "",
    utmContent: "",
    utmTerm: "",
    ignored: "not forwarded",
  });
  assert.deepEqual(result, {
    name: "Test Visitor",
    email: "test@example.com",
    phone: "+61 400 000 000",
    interestCategory: "Something else",
    message: "A controlled test enquiry.",
    marketingConsent: false,
    submissionId: "",
    sourcePath: "",
    utmSource: "",
    utmMedium: "",
    utmCampaign: "",
    utmContent: "",
    utmTerm: "",
  });
  for (const interestCategory of ["Workplace or organisation", "Event, conference or venue", "Media or interview", "Venue or studio partnership"]) {
    assert.equal(validateContactInput({ ...result, interestCategory }).interestCategory, interestCategory);
  }
  assert.throws(() => validateContactInput({ ...result, interestCategory: "Injected category" }));
});

test("contact bridge keeps tokens server-side and returns a PII-free success", async () => {
  let forwarded;
  let fetchCalls = 0;
  const db = new MemoryContactsDb();
  const request = () => new Request("https://shemotion.com.au/api/contact", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://shemotion.com.au" },
    body: JSON.stringify({
      name: "Test Visitor",
      email: "test@example.com",
      phone: "",
      interestCategory: "Something else",
      message: "Controlled test",
      submissionId: "55555555-5555-4555-8555-555555555555",
    }),
  });
  const fetchImpl = async (_url, options) => {
    fetchCalls += 1;
    forwarded = JSON.parse(options.body);
    return new Response(JSON.stringify({ ok: true, action: "contact_submit" }), { status: 200 });
  };
  const context = () => ({
    request: request(),
    env: { CONTACT_WEBHOOK_URL: URL, CONTACT_WEBHOOK_TOKEN: CONTACT_TOKEN, DB: db },
  });
  const response = await processContactRequest(context(), fetchImpl);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(forwarded.token, CONTACT_TOKEN);
  assert.equal(forwarded.payload.email, "test@example.com");
  const repeated = await processContactRequest(context(), fetchImpl);
  assert.equal(repeated.status, 200);
  assert.deepEqual(await repeated.json(), { ok: true });
  assert.equal(fetchCalls, 1);
});

test("outreach bridge strips forbidden fields and exposes only aggregate enquiry data", async () => {
  const upstream = {
    ok: true,
    action: "outreach_snapshot",
    generatedAt: "2026-09-24T00:00:00.000Z",
    tracker: { rows: [{ target: "Example", outcomeType: "Positive", contactPerson: "Private", notes: "Private" }] },
    enquiries: { items: [{ timestamp: "2026-09-24T01:00:00.000Z", category: "Booking", email: "private@example.com", message: "Private" }] },
    spreadsheetId: "private-id",
  };
  const response = await processOutreachRequest({
    env: { CONTACT_WEBHOOK_URL: URL, OUTREACH_DASHBOARD_TOKEN: OUTREACH_TOKEN },
  }, async (_url, options) => {
    const request = JSON.parse(options.body);
    assert.equal(request.action, "outreach_snapshot");
    assert.equal(request.token, OUTREACH_TOKEN);
    return new Response(JSON.stringify(upstream), { status: 200 });
  });
  const text = await response.text();
  assert.equal(response.status, 200);
  assert.doesNotMatch(text, /private@example\.com|Private|private-id|contactPerson|notes/);
  const result = JSON.parse(text);
  assert.equal(result.tracker.rows[0].target, "Example");
  assert.equal(result.tracker.rows[0].outcomeType, "Positive");
  assert.deepEqual(result.enquiries.items[0], { timestamp: "2026-09-24T01:00:00.000Z", category: "Booking" });
});

test("date filters use last activity, response and sent dates in priority order", () => {
  const rows = [
    { status: "Sent", sentDate: "2026-09-01", responseDate: "", lastActivityDate: "", outcomeType: "", responseOutcome: "" },
    { status: "Replied", sentDate: "2026-09-01", responseDate: "2026-09-20", lastActivityDate: "2026-09-22", outcomeType: "Positive", responseOutcome: "Accepted" },
  ];
  const snapshot = { tracker: { rows }, enquiries: { items: [{ timestamp: "2026-09-23T00:00:00.000Z", category: "Booking" }] } };
  assert.equal(recordActivityDate(rows[1]), "2026-09-22");
  assert.deepEqual(periodBounds("7", new Date("2026-09-24T12:00:00+10:00")), { start: "2026-09-18", end: "2026-09-24" });
  const filtered = filterSnapshot(snapshot, { start: "2026-09-18", end: "2026-09-24" });
  assert.equal(filtered.rows.length, 1);
  assert.equal(filtered.enquiries.length, 1);
  assert.deepEqual(summarise(filtered.rows, filtered.enquiries), {
    opportunities: 1,
    sent: 1,
    responses: 1,
    positive: 1,
    enquiries: 1,
  });
});

test("snapshot sanitization never preserves non-allowlisted properties", () => {
  const result = sanitizeOutreachSnapshot({
    ok: true,
    generatedAt: "2026-09-24T00:00:00Z",
    tracker: { rows: [{ target: "Allowed", privateNotes: "Forbidden", visitorEmail: "forbidden@example.com" }] },
    enquiries: { items: [] },
  });
  assert.equal(result.tracker.rowCount, 1);
  assert.equal(result.tracker.rows[0].target, "Allowed");
  assert.equal("privateNotes" in result.tracker.rows[0], false);
  assert.equal("visitorEmail" in result.tracker.rows[0], false);
});
