import { jsonResponse, rowToPublicEvent } from "../../shared/events.js";

export async function onRequestGet({ env }) {
  try {
    const now = new Date().toISOString();
    const result = await env.DB.prepare(`
      SELECT id, title, event_type, venue_name, suburb, start_at, end_at, timezone,
             audience, short_description, booking_label, booking_url, availability_status
      FROM events
      WHERE is_published = 1
        AND (start_at >= ?1 OR (end_at IS NOT NULL AND end_at >= ?1))
      ORDER BY start_at ASC, display_order ASC
    `).bind(now).all();

    return jsonResponse(
      { events: result.results.map(rowToPublicEvent) },
      200,
      { "cache-control": "public, max-age=60, stale-while-revalidate=120" }
    );
  } catch {
    return jsonResponse({ error: "Upcoming events are temporarily unavailable." }, 500, {
      "cache-control": "no-store",
    });
  }
}
