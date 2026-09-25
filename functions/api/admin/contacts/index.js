import { CONTACT_STATUSES, CONTACT_TYPES, MARKETING_STATUSES } from "../../../../shared/contacts.js";
import { jsonResponse } from "../../../../shared/events.js";

const HEADERS = { "cache-control": "no-store, private", "x-content-type-options": "nosniff" };
const SORTS = {
  activity: "c.last_activity_at DESC, c.id DESC",
  first_contact: "c.first_contact_at DESC, c.id DESC",
  name: "c.first_name COLLATE NOCASE, c.last_name COLLATE NOCASE, c.id",
  email: "c.email_normalized, c.id",
};

function safeFilter(value, choices, fallback = "") {
  const text = String(value || "").trim();
  return choices.includes(text) ? text : fallback;
}

function safeSearch(value) {
  return String(value || "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
}

function rowToContact(row) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    contactType: row.contact_type,
    status: row.status,
    marketingStatus: row.marketing_status,
    marketingConsentAt: row.marketing_consent_at || "",
    firstSource: row.first_source,
    firstSourceUrl: row.first_source_url,
    firstContactAt: row.first_contact_at,
    lastActivityAt: row.last_activity_at,
  };
}

export async function processContactsListRequest({ request, env }) {
  const url = new URL(request.url);
  const contactType = safeFilter(url.searchParams.get("type"), CONTACT_TYPES);
  const status = safeFilter(url.searchParams.get("status"), CONTACT_STATUSES);
  const marketing = safeFilter(url.searchParams.get("marketing"), MARKETING_STATUSES);
  const search = safeSearch(url.searchParams.get("search"));
  const sort = safeFilter(url.searchParams.get("sort"), Object.keys(SORTS), "activity");
  const conditions = [];
  const values = [];

  if (contactType) { conditions.push("c.contact_type = ?"); values.push(contactType); }
  if (status) { conditions.push("c.status = ?"); values.push(status); }
  if (marketing === "not_given") conditions.push("latest.id IS NULL");
  if (marketing === "subscribed") conditions.push("latest.status = 'granted'");
  if (marketing === "unsubscribed") conditions.push("latest.status = 'withdrawn'");
  if (search) {
    const escaped = `%${search.replace(/[\\%_]/g, "\\$&")}%`;
    conditions.push("(c.first_name LIKE ? ESCAPE '\\' OR c.last_name LIKE ? ESCAPE '\\' OR c.email_normalized LIKE ? ESCAPE '\\')");
    values.push(escaped, escaped, escaped.toLowerCase());
  }

  try {
    const result = await env.DB.prepare(`
      WITH latest_consent AS (
        SELECT cc.*, ROW_NUMBER() OVER (PARTITION BY contact_id, consent_type ORDER BY recorded_at DESC, id DESC) AS consent_rank
        FROM contact_consents cc
        WHERE consent_type = 'marketing_email'
      )
      SELECT c.*,
             CASE WHEN latest.id IS NULL THEN 'not_given'
                  WHEN latest.status = 'granted' THEN 'subscribed'
                  ELSE 'unsubscribed' END AS marketing_status,
             latest.recorded_at AS marketing_consent_at
      FROM contacts c
      LEFT JOIN latest_consent latest ON latest.contact_id = c.id AND latest.consent_rank = 1
      ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""}
      ORDER BY ${SORTS[sort]}
      LIMIT 500
    `).bind(...values).all();
    return jsonResponse({ contacts: result.results.map(rowToContact), total: result.results.length }, 200, HEADERS);
  } catch {
    return jsonResponse({ error: "Contacts could not be loaded." }, 500, HEADERS);
  }
}

export function onRequestGet(context) {
  return processContactsListRequest(context);
}
