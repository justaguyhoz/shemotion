import { positiveInteger, validateEnquiryAdminInput } from "../../../../shared/contacts.js";
import { jsonResponse } from "../../../../shared/events.js";

const HEADERS = { "cache-control": "no-store, private", "x-content-type-options": "nosniff" };

export async function processEnquiryUpdateRequest({ request, params, env }) {
  let id;
  let input;
  try { id = positiveInteger(params.id); input = validateEnquiryAdminInput(await request.json()); }
  catch { return jsonResponse({ error: "Please check the enquiry details." }, 400, HEADERS); }
  try {
    const result = await env.DB.prepare(`
      UPDATE enquiries
      SET status = ?, admin_notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING id
    `).bind(input.status, input.adminNotes, id).first();
    if (!result) return jsonResponse({ error: "Enquiry not found." }, 404, HEADERS);
    return jsonResponse({ ok: true }, 200, HEADERS);
  } catch {
    return jsonResponse({ error: "The enquiry could not be updated." }, 500, HEADERS);
  }
}

export function onRequestPut(context) { return processEnquiryUpdateRequest(context); }
