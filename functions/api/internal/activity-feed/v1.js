import { callAppsScript, getAppsScriptConfig } from "../../../../shared/apps-script.js";
import { aggregate, CONTRACT_VERSION, freshness, inquiryFacts, outreachFacts, periodFor, RECORD_LIMIT, sourceDate } from "../../../../shared/activity-feed.js";

const HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store, private", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer" };
const reply = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { ...HEADERS, ...headers } });
const validToken = (value) => typeof value === "string" && /^[A-Za-z0-9_-]{32,256}$/.test(value);
const configured = (env) => validToken(env.SHEMOTION_ACTIVITY_FEED_TOKEN) &&
  ![env.SHEMOTION_ACTIVITY_FEED_TOKEN, env.SHEMOTION_ACTIVITY_FEED_PREVIOUS_TOKEN].filter(Boolean)
    .some((token) => [env.CONTACT_WEBHOOK_TOKEN, env.OUTREACH_DASHBOARD_TOKEN].includes(token));

async function tokenMatches(provided, expected) {
  const encode = new TextEncoder();
  const a = new Uint8Array(await crypto.subtle.digest("SHA-256", encode.encode(provided)));
  const b = new Uint8Array(await crypto.subtle.digest("SHA-256", encode.encode(expected)));
  let difference = 0;
  for (let i = 0; i < 32; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}

async function authenticated(request, env) {
  const match = /^Bearer ([A-Za-z0-9_-]{32,256})$/.exec(request.headers.get("authorization") || "");
  if (!match || request.headers.has("origin") || !validToken(env.SHEMOTION_ACTIVITY_FEED_TOKEN)) return false;
  const current = await tokenMatches(match[1], env.SHEMOTION_ACTIVITY_FEED_TOKEN);
  const previous = await tokenMatches(match[1], validToken(env.SHEMOTION_ACTIVITY_FEED_PREVIOUS_TOKEN) ? env.SHEMOTION_ACTIVITY_FEED_PREVIOUS_TOKEN : env.SHEMOTION_ACTIVITY_FEED_TOKEN);
  return current || previous;
}

const unavailable = (code) => ({ availability: "unavailable", error: { code }, records: null, aggregates: null, latestActivityAt: null, freshness: { state: "unknown", sourceUpdatedAt: null } });

async function withReadDeadline(operation) {
  let timer;
  try {
    return await Promise.race([operation, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("read_timeout")), 10000); })]);
  } finally { clearTimeout(timer); }
}

async function inboundSource(env, now, period) {
  try {
    // Deliberately no contacts join, messages, notes, consent, URLs or free-text campaign fields.
    const result = await withReadDeadline(env.DB.prepare(`SELECT id, enquiry_type, source, source_platform,
      utm_source, utm_medium, submitted_at, updated_at, status, notification_status, notification_required
      FROM enquiries WHERE julianday(submitted_at) >= julianday(?) AND julianday(submitted_at) < julianday(?)
      ORDER BY julianday(submitted_at) DESC, id DESC LIMIT ?`)
      .bind(period.start, period.endExclusive, RECORD_LIMIT + 1).all());
    if (result.success !== true || !Array.isArray(result.results)) throw new Error("unavailable");
    const records = inquiryFacts(result.results, now);
    const truncated = result.results.length > RECORD_LIMIT;
    const updatedAt = records.map((r) => r.freshness.sourceUpdatedAt).filter(Boolean).sort().at(-1) || null;
    return {
      availability: truncated ? "partial" : "complete", error: truncated ? { code: "record_limit" } : null,
      records, aggregates: aggregate(records, "inbound", period),
      latestActivityAt: records.map((r) => r.submittedAt).sort().at(-1) || null,
      freshness: freshness(updatedAt, now), checkedAt: now.toISOString(),
      provenance: "direct_d1_read_not_gmail", attributionLimitations: ["campaign_and_event_references_unavailable", "source_classification_is_not_causal_attribution"],
    };
  } catch { return unavailable("inbound_read_failed"); }
}

async function boundedBridgeFetch(fetchImpl, url, options) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetchImpl(url, { ...options, signal: controller.signal });
    if (!response.ok || !response.body) throw new Error("upstream_failed");
    const reader = response.body.getReader();
    const chunks = [];
    let bytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > 2 * 1024 * 1024) throw new Error("upstream_limit");
        chunks.push(value);
      }
    } finally { await reader.cancel(); }
    return new Response(new Blob(chunks), { status: 200 });
  } finally { clearTimeout(timeout); }
}

async function outreachSource(env, now, period, fetchImpl) {
  // Deployment gate: no production Sheet writes or invented row identities.
  if (env.SHEMOTION_ACTIVITY_OUTREACH_IDS_READY !== "true") return unavailable("stable_ids_required");
  try {
    const config = getAppsScriptConfig(env, "OUTREACH_DASHBOARD_TOKEN");
    const payload = await callAppsScript(config.url, { action: "outreach_snapshot", token: config.token }, (url, options) => boundedBridgeFetch(fetchImpl, url, options));
    const records = outreachFacts(payload, now);
    const atLimit = records.length === 5000;
    return {
      availability: atLimit ? "partial" : "complete", error: atLimit ? { code: "record_limit" } : null,
      records, aggregates: aggregate(records, "outreach", period),
      latestActivityAt: records.map((r) => r.activityAt).filter(Boolean).sort().at(-1) || null,
      // generatedAt means bridge execution, not a Sheet content modification timestamp.
      freshness: { state: "unknown", sourceUpdatedAt: null },
      snapshotGeneratedAt: sourceDate(payload.generatedAt), checkedAt: now.toISOString(),
      provenance: "manual_sheet_snapshot", limitations: ["no_sheet_updated_timestamp", "not_an_event_history", "campaign_and_event_references_unavailable"],
    };
  } catch (error) { return unavailable(error?.message === "stable_ids_required" ? "stable_ids_required" : "outreach_read_failed"); }
}

export async function processActivityFeed({ request, env }, { now = new Date(), fetchImpl = fetch } = {}) {
  if (request.method !== "GET") return reply({ error: "method_not_allowed" }, 405, { allow: "GET" });
  if (!configured(env)) return reply({ error: "service_unavailable" }, 503);
  if (!await authenticated(request, env)) return reply({ error: "unauthorized" }, 401, { "www-authenticate": "Bearer" });
  let period;
  try { period = periodFor(new URL(request.url), now); }
  catch { return reply({ error: "invalid_period_or_parameter" }, 400); }
  const [inbound, outreach] = await Promise.all([inboundSource(env, now, period), outreachSource(env, now, period, fetchImpl)]);
  const statuses = [inbound.availability, outreach.availability];
  const availability = statuses.every((s) => s === "complete") ? "complete" : statuses.every((s) => s === "unavailable") ? "unavailable" : "partial";
  return reply({ schemaVersion: CONTRACT_VERSION, business: "shemotion", generatedAt: now.toISOString(), period, availability, sources: { outreach, inbound } }, availability === "unavailable" ? 503 : 200);
}

// Release lock: remove only in the separately approved production activation.
// Local contract tests exercise processActivityFeed without exposing a live route.
export function onRequest() { return reply({ error: "not_found" }, 404); }
