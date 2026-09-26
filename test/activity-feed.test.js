import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { aggregate, CONTRACT_VERSION, freshness, inquiryFacts, outreachFacts, periodFor, sourceDate } from "../shared/activity-feed.js";
import { processActivityFeed } from "../functions/api/internal/activity-feed/v1.js";

const NOW = new Date("2026-09-26T02:00:00Z");
const TOKEN = "fixture_service_".repeat(3);
const BRIDGE_TOKEN = "fixture_bridge_".repeat(3);
const PRIVATE = "LEAK_SENTINEL_private@example.test +61 400 123 456 private pitch message consent gmail-thread-123";
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const period = { start: "2026-09-01T00:00:00.000Z", endExclusive: NOW.toISOString() };

function inquiry(overrides = {}) {
  return { id: 1, enquiry_type: "Upcoming event or booking", source: "website_contact_form", source_platform: "event", utm_source: "event", utm_medium: "referral", submitted_at: "2026-09-20T00:00:00Z", updated_at: "2026-09-25 00:00:00", status: "new", notification_status: "sent", notification_required: 1, ...overrides };
}
function tracker(overrides = {}) {
  return { activityId: uuid(1), status: "Sent", sentDate: "2026-09-20", priority: "High", category: "Media", contactRoute: "Email", ...overrides };
}
function snapshot(rows = [tracker()]) {
  return { ok: true, action: "outreach_snapshot", generatedAt: NOW.toISOString(), tracker: { rows }, enquiries: { items: [{ timestamp: NOW.toISOString(), category: PRIVATE, message: PRIVATE }] } };
}
function database(rows = [inquiry()]) {
  return { prepare(sql) {
    assert.match(sql, /^SELECT /);
    assert.doesNotMatch(sql, /\b(?:INSERT|UPDATE|DELETE|JOIN|message|admin_notes|consent|email|phone|referrer_url|source_url|utm_campaign)\b/i);
    return { bind(start, end, limit) {
      assert.equal(limit, 1001);
      assert.ok(start < end);
      return { all: async () => ({ success: true, results: rows }) };
    } };
  } };
}
function context({ headers = { authorization: `Bearer ${TOKEN}` }, method = "GET", query = "", env = {} } = {}) {
  return { request: new Request(`https://shemotion.com.au/api/internal/activity-feed/v1${query}`, { method, headers }), env: { SHEMOTION_ACTIVITY_FEED_TOKEN: TOKEN, DB: database(), ...env } };
}
const enabled = { SHEMOTION_ACTIVITY_OUTREACH_IDS_READY: "true", CONTACT_WEBHOOK_URL: "https://script.google.com/macros/s/fixture/exec", OUTREACH_DASHBOARD_TOKEN: BRIDGE_TOKEN };
const bridge = (payload) => async (_url, options) => {
  assert.equal(options.method, "POST");
  assert.deepEqual(JSON.parse(options.body), { action: "outreach_snapshot", token: BRIDGE_TOKEN });
  return new Response(JSON.stringify(payload));
};

test("service auth rejects missing, invalid, admin-only, cookie-only, query secrets and browser origins without reads", async () => {
  for (const headers of [{}, { authorization: "Bearer wrong" }, { authorization: `Bearer ${"z".repeat(40)}` }, { "cf-access-jwt-assertion": TOKEN }, { cookie: `session=${TOKEN}` }, { authorization: `Bearer ${TOKEN}`, origin: "https://shemotion.com.au" }]) {
    const response = await processActivityFeed(context({ headers, env: { DB: { prepare() { assert.fail("unauthorized read"); } } } }), { now: NOW, fetchImpl: () => assert.fail("unauthorized fetch") });
    assert.equal(response.status, 401);
  }
  const response = await processActivityFeed(context({ query: `?token=${TOKEN}` }), { now: NOW });
  assert.equal(response.status, 400);
  const absent = await processActivityFeed(context({ env: { SHEMOTION_ACTIVITY_FEED_TOKEN: undefined } }), { now: NOW });
  assert.equal(absent.status, 503);
  const reused = await processActivityFeed(context({ env: { OUTREACH_DASHBOARD_TOKEN: TOKEN } }), { now: NOW });
  assert.equal(reused.status, 503);
});

test("all unsupported methods reject without source execution", async () => {
  for (const method of ["POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]) {
    const response = await processActivityFeed(context({ method }), { now: NOW, fetchImpl: () => assert.fail("write method") });
    assert.equal(response.status, 405);
    assert.equal(response.headers.get("allow"), "GET");
  }
});

test("valid service auth and rotation work; missing outreach IDs are unavailable, never zero", async () => {
  for (const headers of [{ authorization: `Bearer ${TOKEN}` }, { authorization: `Bearer ${"previous_fixture_".repeat(3)}` }]) {
    const response = await processActivityFeed(context({ headers, env: { SHEMOTION_ACTIVITY_FEED_PREVIOUS_TOKEN: "previous_fixture_".repeat(3) } }), { now: NOW, fetchImpl: () => assert.fail("gated bridge must not execute") });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store, private");
    assert.equal(response.headers.get("access-control-allow-origin"), null);
    const body = await response.json();
    assert.equal(body.schemaVersion, CONTRACT_VERSION);
    assert.equal(body.business, "shemotion");
    assert.equal(body.availability, "partial");
    assert.equal(body.sources.outreach.error.code, "stable_ids_required");
    assert.equal(body.sources.outreach.records, null);
    assert.equal(body.sources.outreach.aggregates, null);
    assert.equal(body.sources.inbound.aggregates.totalEnquiries, 1);
  }
});

test("outreach contract covers draft, sent, reply, due, overdue, outcome and high priority without inferring replies from notes", () => {
  const rows = [
    tracker({ activityId: uuid(1), status: "Drafted", sentDate: "", draftDate: "2026-09-20" }),
    tracker({ activityId: uuid(2), status: "Sent", responseOutcome: "No reply" }),
    tracker({ activityId: uuid(3), status: "Replied", responseDate: "2026-09-25" }),
    tracker({ activityId: uuid(4), followUpDate: "2026-09-26" }),
    tracker({ activityId: uuid(5), followUpDate: "2026-09-25" }),
    tracker({ activityId: uuid(6), status: "Won", outcomeType: "Positive", followUpDate: "2026-09-25" }),
    tracker({ activityId: uuid(7), status: "No response", priority: "Medium" }),
  ];
  const facts = outreachFacts(snapshot(rows), NOW);
  assert.equal(facts[0].status, "drafted");
  assert.equal(facts[1].responseState, "unknown");
  assert.equal(facts[2].responseState, "replied");
  assert.equal(facts[3].followUpState, "due");
  assert.equal(facts[4].followUpState, "overdue");
  assert.equal(facts[5].followUpState, "not_due");
  assert.equal(facts[5].outcomeCategory, "positive");
  assert.equal(facts[6].responseState, "no_response_recorded");
  const totals = aggregate(facts, "outreach", period);
  assert.equal(totals.contactedInPeriod, 6);
  assert.equal(totals.repliedInPeriod, 1);
  assert.equal(totals.followUpDue, 1);
  assert.equal(totals.overdue, 1);
  assert.equal(totals.highPriority, 6);
});

test("outreach identities survive names, ordering and dates; missing or repeated IDs fail closed", () => {
  const first = tracker(), second = tracker({ activityId: uuid(2) });
  const a = outreachFacts(snapshot([first, second]), NOW);
  const b = outreachFacts(snapshot([second, { ...first, target: PRIVATE, sentDate: "2026-09-21" }]), NOW);
  assert.equal(a[0].sourceId, b[1].sourceId);
  for (const rows of [[tracker({ activityId: undefined })], [first, first], [tracker({ activityId: PRIVATE })]]) assert.throws(() => outreachFacts(snapshot(rows), NOW), /stable_ids_required/);
  assert.throws(() => outreachFacts({ ok: true, action: "outreach_snapshot", tracker: {} }, NOW));
});

test("inbound facts distinguish new, reviewed, replied, closed and notification-only state; unavailable event/UTM attribution is not invented", () => {
  const records = inquiryFacts([
    inquiry(), inquiry({ id: 2, status: "reviewed", source_platform: "google_organic", utm_source: "google", utm_campaign: "retreat", event_id: 5 }),
    inquiry({ id: 3, status: "replied", source: "manual_admin_entry", notification_required: 0 }),
    inquiry({ id: 4, status: "closed", source_platform: undefined, utm_source: undefined, utm_medium: undefined }),
  ], NOW);
  assert.equal(records[1].utmSource, "google");
  assert.equal(records[1].campaignRef, null);
  assert.equal(records[1].eventRef, null);
  assert.equal(records[2].notificationState, "not_required");
  assert.equal(records[3].sourcePlatform, "unknown");
  assert.equal(records[3].utmMedium, null);
  const totals = aggregate(records, "inbound", period);
  assert.equal(totals.totalEnquiries, 4);
  assert.equal(totals.unactioned, 1);
  assert.equal(totals.responded, 1);
});

test("PII sentinel in every free-text field never reaches feed facts, errors or token responses", async () => {
  const privateFields = { name: PRIVATE, email: PRIVATE, phone: PRIVATE, message: PRIVATE, notes: PRIVATE, consent: PRIVATE, gmailThreadId: PRIVATE, target: PRIVATE, website: PRIVATE, pitchAngle: PRIVATE, responseOutcome: PRIVATE, coverageBacklinkUrl: PRIVATE, desiredOutcome: PRIVATE, campaignRef: PRIVATE, eventRef: PRIVATE, utm_campaign: PRIVATE, source_url: PRIVATE, referrer_url: PRIVATE };
  const response = await processActivityFeed(context({ env: { ...enabled, DB: database([inquiry({ ...privateFields, enquiry_type: PRIVATE, source: PRIVATE, source_platform: PRIVATE, utm_source: PRIVATE, utm_medium: PRIVATE })]) } }), { now: NOW, fetchImpl: bridge(snapshot([tracker({ ...privateFields, category: PRIVATE, status: PRIVATE, priority: PRIVATE, contactRoute: PRIVATE, stream: PRIVATE, outcomeType: PRIVATE })])) });
  assert.equal(response.status, 200);
  const text = await response.text();
  for (const value of ["LEAK_SENTINEL", "private@example", "400 123", "gmail-thread", TOKEN, BRIDGE_TOKEN, "pitchAngle", "responseOutcome", "consent"]) assert.ok(!text.includes(value), value);
  const body = JSON.parse(text);
  assert.equal(body.availability, "complete");
  assert.equal(body.sources.outreach.freshness.state, "unknown");
});

test("source failures never become empty successful sources or leak exception content", async () => {
  for (const fetchImpl of [async () => { throw new Error(PRIVATE); }, async () => new Response(PRIVATE), bridge({ ok: true, action: "outreach_snapshot", tracker: {} }), bridge(snapshot([tracker({ activityId: undefined })]))]) {
    const response = await processActivityFeed(context({ env: { ...enabled, DB: { prepare() { throw new Error(PRIVATE); } } } }), { now: NOW, fetchImpl });
    assert.equal(response.status, 503);
    const text = await response.text();
    assert.ok(!text.includes("LEAK_SENTINEL"));
    const body = JSON.parse(text);
    assert.equal(body.availability, "unavailable");
    assert.equal(body.sources.inbound.records, null);
    assert.equal(body.sources.outreach.records, null);
  }
});

test("one source can succeed when the other fails; caps are partial and clearly scoped", async () => {
  const rows = Array.from({ length: 1001 }, (_, i) => inquiry({ id: i + 1 }));
  const response = await processActivityFeed(context({ env: { DB: database(rows) } }), { now: NOW });
  const body = await response.json();
  assert.equal(body.sources.inbound.availability, "partial");
  assert.equal(body.sources.inbound.records.length, 1000);
  assert.equal(body.sources.inbound.aggregates.scope, "returned_records_only");
  assert.equal(body.sources.inbound.error.code, "record_limit");
  const reverse = await processActivityFeed(context({ env: { ...enabled, DB: null } }), { now: NOW, fetchImpl: bridge(snapshot()) });
  assert.equal((await reverse.json()).sources.outreach.availability, "complete");
});

test("real empty sources are distinct from failures and upstream payload size is bounded", async () => {
  const empty = await processActivityFeed(context({ env: { ...enabled, DB: database([]) } }), { now: NOW, fetchImpl: bridge(snapshot([])) });
  const body = await empty.json();
  assert.equal(body.availability, "complete");
  assert.deepEqual(body.sources.inbound.records, []);
  assert.equal(body.sources.inbound.aggregates.totalEnquiries, 0);
  const large = await processActivityFeed(context({ env: enabled }), { now: NOW, fetchImpl: async () => new Response("x".repeat(2 * 1024 * 1024 + 1)) });
  assert.equal((await large.json()).sources.outreach.availability, "unavailable");
});

test("inbound primary keys and submission timestamps are required; arbitrary objects are not facts", () => {
  for (const rows of [[inquiry({ id: PRIVATE })], [inquiry(), inquiry()], [inquiry({ submitted_at: PRIVATE })], [inquiry({ submitted_at: "2026-12-01" })], null]) assert.throws(() => inquiryFacts(rows, NOW));
});

test("dates remain unknown when missing, ambiguous, invalid or future; bridge time is not source time", () => {
  for (const value of [undefined, "", "25/09/2026", "2026-02-30", PRIVATE]) assert.equal(sourceDate(value), null);
  assert.equal(freshness(null, NOW).state, "unknown");
  assert.equal(freshness("2026-09-27T00:00:00Z", NOW).state, "unknown");
  assert.equal(freshness("2026-09-01T00:00:00Z", NOW).state, "stale");
  const facts = outreachFacts(snapshot([tracker({ sentDate: "", draftDate: "", lastActivityDate: "", followUpDate: "2026-12-01" })]), NOW);
  assert.equal(facts[0].activityAt, null);
  assert.equal(facts[0].freshness.state, "unknown");
  assert.equal(sourceDate("2026-09-25 00:00:00"), "2026-09-25T00:00:00.000Z");
});

test("period is bounded, half-open and does not allow arbitrary scope", () => {
  for (const query of ["?workspace=other", "?start=2026-09-01", "?start=2026-01-01&end=2026-09-01", "?start=2026-09-25&end=2026-09-24", "?start=2026-09-01&end=2027-01-01", "?start=2026-09-01&start=2026-09-02&end=2026-09-24"]) assert.throws(() => periodFor(new URL("https://example.test/" + query), NOW));
  assert.equal(periodFor(new URL("https://example.test/?start=2026-09-01&end=2026-09-25"), NOW).endExclusive, "2026-09-25T00:00:00.000Z");
});

test("source boundary has no logs, mutations, contact-submit action or frontend secret dependency", async () => {
  const handler = await readFile(new URL("../functions/api/internal/activity-feed/v1.js", import.meta.url), "utf8");
  assert.doesNotMatch(handler, /console\.|contact_submit|\.run\(|\.batch\(|localStorage|document\.|window\./);
  assert.match(handler, /tokenMatches/);
  const build = await readFile(new URL("../scripts/build.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(build, /activity-feed|SHEMOTION_ACTIVITY_FEED/);
});

test("versioned record shapes remain a closed contract", () => {
  const keys = (record) => Object.keys(record).sort();
  assert.deepEqual(keys(inquiryFacts([inquiry()], NOW)[0]), ["sourceId", "enquiryType", "submittedAt", "sourceKind", "sourcePlatform", "utmSource", "utmMedium", "campaignRef", "eventRef", "status", "notificationState", "freshness", "provenance"].sort());
  assert.deepEqual(keys(outreachFacts(snapshot(), NOW)[0]), ["sourceId", "subjectType", "channel", "priority", "status", "draftAt", "sentAt", "followUpAt", "responseAt", "activityAt", "responseState", "outcomeCategory", "followUpState", "stream", "campaignRef", "eventRef", "freshness", "provenance"].sort());
  assert.deepEqual(keys(freshness(null, NOW)), ["sourceUpdatedAt", "state"]);
});
