import { positiveInteger, validateContactAdminInput } from "../../../../shared/contacts.js";
import { jsonResponse } from "../../../../shared/events.js";

const HEADERS = { "cache-control": "no-store, private", "x-content-type-options": "nosniff" };

function contactResponse(row) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    contactType: row.contact_type,
    status: row.status,
    firstSource: row.first_source,
    firstSourceUrl: row.first_source_url,
    firstUtmSource: row.first_utm_source,
    firstUtmMedium: row.first_utm_medium,
    firstUtmCampaign: row.first_utm_campaign,
    firstUtmContent: row.first_utm_content,
    firstUtmTerm: row.first_utm_term,
    firstContactAt: row.first_contact_at,
    lastActivityAt: row.last_activity_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    marketingStatus: row.marketing_status,
    marketingConsentAt: row.marketing_consent_at || "",
    marketingConsentSource: row.marketing_consent_source || "",
    marketingConsentText: row.marketing_consent_text || "",
    marketingConsentVersion: row.marketing_consent_version || "",
  };
}

function enquiryResponse(row) {
  return {
    id: row.id,
    enquiryType: row.enquiry_type,
    message: row.message,
    source: row.source,
    sourceUrl: row.source_url,
    utmSource: row.utm_source,
    utmMedium: row.utm_medium,
    utmCampaign: row.utm_campaign,
    utmContent: row.utm_content,
    utmTerm: row.utm_term,
    submittedAt: row.submitted_at,
    status: row.status,
    adminNotes: row.admin_notes,
    notificationStatus: row.notification_status,
  };
}

function consentResponse(row) {
  return {
    id: row.id,
    consentType: row.consent_type,
    status: row.status,
    source: row.source,
    consentText: row.consent_text,
    consentVersion: row.consent_version,
    recordedAt: row.recorded_at,
  };
}

export async function processContactDetailRequest({ params, env }) {
  let id;
  try { id = positiveInteger(params.id); } catch { return jsonResponse({ error: "Contact not found." }, 404, HEADERS); }
  try {
    const contact = await env.DB.prepare(`
      WITH latest AS (
        SELECT * FROM contact_consents
        WHERE contact_id = ? AND consent_type = 'marketing_email'
        ORDER BY recorded_at DESC, id DESC LIMIT 1
      )
      SELECT c.*,
             CASE WHEN latest.id IS NULL THEN 'not_given'
                  WHEN latest.status = 'granted' THEN 'subscribed'
                  ELSE 'unsubscribed' END AS marketing_status,
             latest.recorded_at AS marketing_consent_at,
             latest.source AS marketing_consent_source,
             latest.consent_text AS marketing_consent_text,
             latest.consent_version AS marketing_consent_version
      FROM contacts c LEFT JOIN latest ON 1 = 1
      WHERE c.id = ?
    `).bind(id, id).first();
    if (!contact) return jsonResponse({ error: "Contact not found." }, 404, HEADERS);
    const [enquiries, consents] = await Promise.all([
      env.DB.prepare(`SELECT * FROM enquiries WHERE contact_id = ? ORDER BY submitted_at DESC, id DESC`).bind(id).all(),
      env.DB.prepare(`SELECT * FROM contact_consents WHERE contact_id = ? ORDER BY recorded_at DESC, id DESC`).bind(id).all(),
    ]);
    return jsonResponse({
      contact: contactResponse(contact),
      enquiries: enquiries.results.map(enquiryResponse),
      consents: consents.results.map(consentResponse),
    }, 200, HEADERS);
  } catch {
    return jsonResponse({ error: "Contact details could not be loaded." }, 500, HEADERS);
  }
}

export async function processContactUpdateRequest({ request, params, env }) {
  let id;
  let input;
  try { id = positiveInteger(params.id); input = validateContactAdminInput(await request.json()); }
  catch { return jsonResponse({ error: "Please check the contact details." }, 400, HEADERS); }
  try {
    const result = await env.DB.prepare(`
      UPDATE contacts
      SET first_name = ?, last_name = ?, phone = ?, contact_type = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING id
    `).bind(input.firstName, input.lastName, input.phone, input.contactType, input.status, id).first();
    if (!result) return jsonResponse({ error: "Contact not found." }, 404, HEADERS);
    return jsonResponse({ ok: true }, 200, HEADERS);
  } catch {
    return jsonResponse({ error: "The contact could not be updated." }, 500, HEADERS);
  }
}

export function onRequestGet(context) { return processContactDetailRequest(context); }
export function onRequestPut(context) { return processContactUpdateRequest(context); }
