import {
  eventValues,
  jsonResponse,
  rowToAdminEvent,
  validateEventInput,
} from "../../../../shared/events.js";

export async function onRequestGet({ env }) {
  try {
    const result = await env.DB.prepare(`
      SELECT * FROM events
      ORDER BY start_at ASC, display_order ASC
    `).all();
    return jsonResponse({ events: result.results.map(rowToAdminEvent) });
  } catch {
    return jsonResponse({ error: "Events could not be loaded." }, 500);
  }
}

export async function onRequestPost({ request, env }) {
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
      INSERT INTO events (
        title, event_type, venue_name, suburb, address, start_at, end_at, timezone,
        audience, short_description, booking_label, booking_url, availability_status,
        is_published, display_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `).bind(...eventValues(validation.event)).first();
    return jsonResponse({ event: rowToAdminEvent(result) }, 201);
  } catch {
    return jsonResponse({ error: "The event could not be created." }, 500);
  }
}
