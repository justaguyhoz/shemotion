import {
  eventValues,
  jsonResponse,
  rowToAdminEvent,
  validateEventInput,
} from "../../../../shared/events.js";

function parseId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function onRequestPut({ request, env, params }) {
  const id = parseId(params.id);
  if (!id) return jsonResponse({ error: "Invalid event ID." }, 400);

  let input;
  try {
    input = await request.json();
  } catch {
    return jsonResponse({ error: "A valid JSON body is required." }, 400);
  }

  const validation = validateEventInput(input);
  if (validation.errors) return jsonResponse({ error: "Validation failed.", details: validation.errors }, 400);

  try {
    const result = await env.DB.prepare(`
      UPDATE events SET
        title = ?, event_type = ?, venue_name = ?, suburb = ?, address = ?,
        start_at = ?, end_at = ?, timezone = ?, audience = ?, short_description = ?,
        booking_label = ?, booking_url = ?, availability_status = ?, is_published = ?,
        display_order = ?
      WHERE id = ?
      RETURNING *
    `).bind(...eventValues(validation.event), id).first();

    if (!result) return jsonResponse({ error: "Event not found." }, 404);
    return jsonResponse({ event: rowToAdminEvent(result) });
  } catch {
    return jsonResponse({ error: "The event could not be updated." }, 500);
  }
}

export async function onRequestDelete({ env, params }) {
  const id = parseId(params.id);
  if (!id) return jsonResponse({ error: "Invalid event ID." }, 400);

  try {
    const existing = await env.DB.prepare("SELECT id FROM events WHERE id = ?").bind(id).first();
    if (!existing) return jsonResponse({ error: "Event not found." }, 404);
    await env.DB.prepare("DELETE FROM events WHERE id = ?").bind(id).run();
    return new Response(null, { status: 204 });
  } catch {
    return jsonResponse({ error: "The event could not be deleted." }, 500);
  }
}
