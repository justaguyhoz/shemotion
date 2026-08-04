import { jsonResponse, rowToPublicEvent } from "../../shared/events.js";
import { expandRecurringEvents } from "../../recurrence.js";

export async function onRequestGet({ env }) {
  try {
    const now = new Date().toISOString();
    const rangeEnd = new Date(Date.parse(now) + 366 * 86400000).toISOString();
    const result = await env.DB.prepare(`
      SELECT id, title, event_type, venue_name, suburb, address, date_status, start_at, end_at, timezone,
             audience, short_description, booking_label, booking_url, availability_status,
             recurrence_frequency, recurrence_until, display_order
      FROM events
      WHERE is_published = 1
        AND (
          date_status = 'tbc'
          OR start_at >= ?1
          OR (end_at IS NOT NULL AND end_at >= ?1)
          OR (recurrence_frequency != 'none' AND (recurrence_until IS NULL OR recurrence_until >= substr(?1, 1, 10)))
        )
      ORDER BY CASE WHEN date_status = 'tbc' THEN 1 ELSE 0 END, start_at ASC, display_order ASC
    `).bind(now).all();

    const events = result.results.map(rowToPublicEvent);
    const expanded = expandRecurringEvents(events, now, rangeEnd);

    return jsonResponse(
      { events: expanded },
      200,
      { "cache-control": "public, max-age=60, stale-while-revalidate=120" }
    );
  } catch {
    return jsonResponse({ error: "Upcoming events are temporarily unavailable." }, 500, {
      "cache-control": "no-store",
    });
  }
}
