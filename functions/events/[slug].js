import { getPublishedEventBySlug } from "../../shared/event-store.js";
import { expandRecurringEvents } from "../../recurrence.js";
import { EMAIL, SITE_URL, escapeHtml, eventDescription, eventJsonLd, formatEventDate, formatEventTime, htmlResponse, pageDocument } from "../../shared/public-pages.js";

function mapUrl(event) {
  if (event.googleMapsUrl) return event.googleMapsUrl;
  const query = [event.venueName, event.address, event.suburb].filter(Boolean).join(", ");
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : null;
}

function currentOccurrence(event) {
  if (event.recurrenceFrequency === "none" || !event.startAt) return event;
  const now = new Date().toISOString();
  const end = new Date(Date.parse(now) + 366 * 86400000).toISOString();
  return expandRecurringEvents([event], now, end)[0] || event;
}

export async function onRequestGet({ env, params }) {
  const event = await getPublishedEventBySlug(env.DB, String(params.slug || ""));
  if (!event) {
    const body = '<main id="top"><section class="page-hero section-pad"><div class="section-heading"><p class="eyebrow">Shemotion events</p><h1>Event not found</h1><p>This event is not available. Explore the current Shemotion events instead.</p><a class="button" href="/events/">View upcoming events</a></div></section></main>';
    return htmlResponse(pageDocument({ title: "Event Not Found | Shemotion", description: "This Shemotion event is not available.", canonical: `${SITE_URL}/events/`, body, status: 404 }), 404);
  }

  const occurrence = currentOccurrence(event);
  const canonical = `${SITE_URL}/events/${encodeURIComponent(event.slug)}/`;
  const description = eventDescription(occurrence);
  const location = [occurrence.venueName, occurrence.suburb].filter(Boolean).join(", ");
  const title = `Shemotion: ${event.title}${event.suburb ? ` - ${event.suburb}` : ""} | Gold Coast Women's Event`;
  const maps = mapUrl(occurrence);
  const booking = occurrence.availabilityStatus === "Cancelled" ? "" : occurrence.bookingUrl
    ? `<a class="button booking-button" href="${escapeHtml(occurrence.bookingUrl)}" target="_blank" rel="noopener noreferrer" data-event-booking data-event-id="${escapeHtml(event.id)}" data-event-name="${escapeHtml(event.title)}" data-event-type="${escapeHtml(event.eventType)}" data-venue-name="${escapeHtml(event.venueName)}" data-suburb="${escapeHtml(event.suburb || "")}">${escapeHtml(event.bookingLabel || "Book now")}</a>`
    : `<a class="button" href="mailto:${EMAIL}">Email Shemotion</a>`;
  const body = `<main id="top" data-event-detail data-event-id="${escapeHtml(event.id)}" data-event-name="${escapeHtml(event.title)}" data-event-type="${escapeHtml(event.eventType)}" data-venue-name="${escapeHtml(event.venueName)}" data-suburb="${escapeHtml(event.suburb || "")}">
    <article class="event-detail-page section-pad"><p class="eyebrow">${escapeHtml(event.eventType)} &middot; ${escapeHtml(event.audience)}</p><h1>${escapeHtml(event.title)}</h1><p class="event-detail-intro">${escapeHtml(description)}</p>
    <dl class="event-facts"><div><dt>Date</dt><dd>${escapeHtml(formatEventDate(occurrence))}</dd></div><div><dt>Time</dt><dd>${escapeHtml(formatEventTime(occurrence))}</dd></div><div><dt>Venue</dt><dd>${escapeHtml(location)}</dd></div>${occurrence.address ? `<div><dt>Address</dt><dd>${escapeHtml(occurrence.address)}</dd></div>` : ""}<div><dt>Availability</dt><dd>${escapeHtml(occurrence.availabilityStatus)}</dd></div><div><dt>Audience</dt><dd>${escapeHtml(occurrence.audience)}</dd></div></dl>
    <div class="event-detail-actions">${booking}${maps ? `<a class="button button-ghost" href="${escapeHtml(maps)}" target="_blank" rel="noopener noreferrer">Open in Google Maps</a>` : ""}</div><nav class="page-back-link" aria-label="Event navigation"><a href="/events/">All events</a> &middot; <a href="/">Shemotion home</a></nav></article></main>`;
  return htmlResponse(pageDocument({ title, description, canonical, body, structuredData: eventJsonLd(occurrence, canonical), bodyAttributes: 'class="event-detail-body"' }));
}
