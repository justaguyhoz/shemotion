import { sanitizeOutreachSnapshot } from "./outreach.js";

export const CONTRACT_VERSION = "shemotion.activity.v1";
export const RECORD_LIMIT = 1000;
const DAY = 86400000;
const platformValues = ["google_ads", "google_organic", "facebook_ads", "facebook_organic", "instagram_ads", "instagram_organic", "outreach", "referral", "event", "direct", "email", "other", "unknown"];
const enquiryTypes = new Map([
  ["Upcoming event or booking", "event_booking"], ["Private group or retreat", "private_group"],
  ["Workplace or organisation", "workplace"], ["Event, conference or venue", "event_venue"],
  ["Media or interview", "media"], ["Venue or studio partnership", "partnership"], ["Something else", "other"],
]);
const choose = (value, choices, fallback = "unknown") => choices.includes(value) ? value : fallback;
const canonical = (value) => typeof value === "string" ? value.trim().toLowerCase().replace(/[ -]+/g, "_") : "";

// Only unambiguous source dates are accepted. Sheet calendar dates use Brisbane time.
export function sourceDate(value) {
  if (typeof value !== "string" || value.length > 40) return null;
  let input = value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) input += "T00:00:00+10:00";
  else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(input)) input = input.replace(" ", "T") + "Z";
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.test(input)) return null;
  const calendar = input.slice(0, 10);
  const check = new Date(calendar + "T00:00:00Z");
  const date = new Date(input);
  return Number.isFinite(date.valueOf()) && Number.isFinite(check.valueOf()) && check.toISOString().slice(0, 10) === calendar ? date.toISOString() : null;
}

export function freshness(sourceUpdatedAt, now) {
  if (!sourceUpdatedAt || Date.parse(sourceUpdatedAt) > now.valueOf()) return { state: "unknown", sourceUpdatedAt };
  return { state: now.valueOf() - Date.parse(sourceUpdatedAt) > 7 * DAY ? "stale" : "recent", sourceUpdatedAt };
}

export function periodFor(url, now) {
  for (const key of url.searchParams.keys()) if (!["start", "end"].includes(key) || url.searchParams.getAll(key).length !== 1) throw new Error("invalid_period");
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");
  if ((start === null) !== (end === null)) throw new Error("invalid_period");
  const date = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || "") ? sourceDate(value + "T00:00:00Z") : null;
  const from = start === null ? new Date(now.valueOf() - 30 * DAY).toISOString() : date(start);
  const until = end === null ? now.toISOString() : date(end);
  if (!from || !until || Date.parse(until) <= Date.parse(from) || Date.parse(until) > now.valueOf() || Date.parse(until) - Date.parse(from) > 90 * DAY) throw new Error("invalid_period");
  return { start: from, endExclusive: until };
}

export function inquiryFacts(rows, now) {
  if (!Array.isArray(rows) || rows.length > RECORD_LIMIT + 1) throw new Error("invalid_source");
  const seen = new Set();
  return rows.slice(0, RECORD_LIMIT).map((row) => {
    if (!Number.isSafeInteger(row?.id) || row.id < 1 || seen.has(row.id)) throw new Error("invalid_source");
    seen.add(row.id);
    const submittedAt = sourceDate(row.submitted_at);
    if (!submittedAt || Date.parse(submittedAt) > now.valueOf()) throw new Error("invalid_source");
    const updatedAt = sourceDate(row.updated_at);
    return {
      sourceId: `shemotion:enquiry:${row.id}`,
      enquiryType: enquiryTypes.get(row.enquiry_type) || "other",
      submittedAt,
      sourceKind: choose(row.source, ["website_contact_form", "manual_admin_entry"]),
      sourcePlatform: choose(row.source_platform, platformValues),
      utmSource: choose(canonical(row.utm_source), ["google", "facebook", "instagram", "email", "outreach", "event", "direct", "referral"], null),
      utmMedium: choose(canonical(row.utm_medium), ["cpc", "ppc", "paid_social", "organic", "social", "email", "referral"], null),
      campaignRef: null, eventRef: null,
      status: choose(row.status, ["new", "reviewed", "replied", "closed"]),
      notificationState: row.notification_required === 0 ? "not_required" : choose(row.notification_status, ["pending", "sending", "sent", "failed"]),
      freshness: freshness(updatedAt, now),
      provenance: { source: "shemotion_d1", evidence: "direct_system_fact", workflow: "manual_tracker_state", attribution: "recorded_source_classification_not_causal_attribution" },
    };
  });
}

export function outreachFacts(payload, now) {
  if (payload?.ok !== true || payload.action !== "outreach_snapshot" || !Array.isArray(payload.tracker?.rows) || payload.tracker.rows.length > 5000) throw new Error("invalid_source");
  const original = payload.tracker.rows;
  const ids = new Set();
  for (const row of original) {
    // The reviewed bridge supplies this only after the Sheet identity rollout.
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(row?.activityId || "")) throw new Error("stable_ids_required");
    const id = row.activityId.toLowerCase();
    if (ids.has(id)) throw new Error("stable_ids_required");
    ids.add(id);
  }
  const rows = sanitizeOutreachSnapshot(payload).tracker.rows;
  if (rows.length !== original.length) throw new Error("invalid_source");
  const today = new Date(now.valueOf() + 10 * 3600000).toISOString().slice(0, 10);
  return rows.map((row) => {
    const status = choose(canonical(row.status), ["drafted", "sent", "replied", "won", "lost", "closed", "no_response"]);
    const date = (value) => { const d = sourceDate(value); return d && Date.parse(d) <= now.valueOf() ? d : null; };
    const draftAt = date(row.draftDate), sentAt = date(row.sentDate), responseAt = date(row.responseDate);
    const activityAt = [date(row.lastActivityDate), responseAt, sentAt, draftAt].filter(Boolean).sort().at(-1) || null;
    const followUpAt = sourceDate(row.followUpDate);
    const followUpDay = followUpAt ? new Date(Date.parse(followUpAt) + 10 * 3600000).toISOString().slice(0, 10) : null;
    const responded = Boolean(responseAt) || status === "replied";
    const closed = ["won", "lost", "closed"].includes(status);
    return {
      sourceId: `shemotion:outreach:${row.activityId.toLowerCase()}`,
      subjectType: choose(canonical(row.category), ["media", "venue", "workplace", "community", "partnership", "event"]),
      channel: choose(canonical(row.contactRoute), ["email", "website", "contact_form", "social", "phone", "in_person"]),
      priority: choose(canonical(row.priority), ["high", "medium", "low"]),
      status, draftAt, sentAt, followUpAt, responseAt, activityAt,
      responseState: responded ? "replied" : status === "no_response" ? "no_response_recorded" : "unknown",
      outcomeCategory: choose(canonical(row.outcomeType), ["positive", "negative", "neutral", "pending"], null),
      followUpState: !followUpDay || closed || responded ? "not_due" : followUpDay < today ? "overdue" : followUpDay === today ? "due" : "scheduled",
      // The bridge may infer stream from private text, so it is not direct category evidence.
      stream: choose(canonical(row.stream), ["media", "workplace", "community", "events", "partnerships"], null),
      campaignRef: null, eventRef: null,
      freshness: freshness(activityAt, now),
      provenance: { source: "shemotion_outreach_sheet", evidence: "manual_tracker_state", followUp: "derived_deterministic_state", stream: "manual_or_inferred_not_attribution" },
    };
  });
}

function breakdown(facts, field) {
  const counts = {};
  for (const fact of facts) { const key = fact[field] || "unknown"; counts[key] = (counts[key] || 0) + 1; }
  return counts;
}

export function aggregate(facts, kind, period) {
  const inPeriod = (date) => date && date >= period.start && date < period.endExclusive;
  if (kind === "inbound") return {
    scope: "returned_records_only", totalEnquiries: facts.length,
    unactioned: facts.filter((f) => f.status === "new").length,
    responded: facts.filter((f) => f.status === "replied").length,
    byStatus: breakdown(facts, "status"), bySourcePlatform: breakdown(facts, "sourcePlatform"),
  };
  return {
    scope: "returned_tracker_rows_not_event_history",
    contactedInPeriod: facts.filter((f) => inPeriod(f.sentAt)).length,
    repliedInPeriod: facts.filter((f) => inPeriod(f.responseAt)).length,
    repliedWithoutDate: facts.filter((f) => f.responseState === "replied" && !f.responseAt).length,
    byStatus: breakdown(facts, "status"),
    followUpDue: facts.filter((f) => f.followUpState === "due").length,
    overdue: facts.filter((f) => f.followUpState === "overdue").length,
    highPriority: facts.filter((f) => f.priority === "high").length,
    outcomes: breakdown(facts, "outcomeCategory"),
  };
}
