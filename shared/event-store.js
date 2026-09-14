import { expandRecurringEvents } from "../recurrence.js";
import { rowToPublicEvent } from "./events.js";

const PUBLIC_EVENT_COLUMNS = `
  events.id, events.title, events.slug, events.event_type,
  COALESCE(locations.name, events.venue_name) AS venue_name,
  COALESCE(locations.suburb, events.suburb) AS suburb,
  COALESCE(locations.address, events.address) AS address,
  events.date_status, events.start_at, events.end_at, events.timezone,
  events.audience, events.short_description, events.booking_label, events.booking_url,
  events.availability_status, events.recurrence_frequency, events.recurrence_until,
  events.display_order, events.location_id, locations.latitude, locations.longitude,
  locations.google_maps_url`;

export async function getUpcomingPublicEvents(db, now = new Date().toISOString()) {
  const rangeEnd = new Date(Date.parse(now) + 366 * 86400000).toISOString();
  const result = await db.prepare(`
    SELECT ${PUBLIC_EVENT_COLUMNS}
    FROM events
    LEFT JOIN locations ON locations.id = events.location_id
    WHERE is_published = 1
      AND (
        date_status = 'tbc'
        OR start_at >= ?1
        OR (end_at IS NOT NULL AND end_at >= ?1)
        OR (recurrence_frequency != 'none' AND (recurrence_until IS NULL OR recurrence_until >= substr(?1, 1, 10)))
      )
    ORDER BY CASE WHEN date_status = 'tbc' THEN 1 ELSE 0 END, start_at ASC, display_order ASC
  `).bind(now).all();

  return expandRecurringEvents(result.results.map(rowToPublicEvent), now, rangeEnd);
}

export async function getPublishedEventBySlug(db, slug) {
  const row = await db.prepare(`
    SELECT ${PUBLIC_EVENT_COLUMNS}, events.updated_at
    FROM events
    LEFT JOIN locations ON locations.id = events.location_id
    WHERE events.is_published = 1 AND events.slug = ?
    LIMIT 1
  `).bind(slug).first();
  return row ? { ...rowToPublicEvent(row), updatedAt: row.updated_at } : null;
}

export async function getPublishedEventUrls(db) {
  const result = await db.prepare(`
    SELECT slug, updated_at
    FROM events
    WHERE is_published = 1 AND slug IS NOT NULL AND trim(slug) != ''
    ORDER BY slug
  `).all();
  return result.results;
}
