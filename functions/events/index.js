import { getUpcomingPublicEvents } from "../../shared/event-store.js";
import { SITE_URL, escapeHtml, eventDescription, formatEventDate, formatEventTime, htmlResponse, pageDocument } from "../../shared/public-pages.js";
import { eventBookingPresentation, eventImageUrl } from "../../event-booking.js";

function eventCard(event) {
  const detailUrl = event.slug ? `/events/${encodeURIComponent(event.slug)}/` : null;
  const presentation = eventBookingPresentation(event);
  const status = presentation.statusLabel
    ? `<span class="event-pill-status status-${presentation.state.replaceAll("_", "-")}">${escapeHtml(presentation.statusLabel)}</span>` : "";
  const booking = presentation.action
    ? `<a class="event-pill-action button booking-button" href="${escapeHtml(presentation.action.href)}" target="_blank" rel="noopener noreferrer" data-event-booking data-event-id="${escapeHtml(event.id)}" data-event-name="${escapeHtml(event.title)}" data-event-type="${escapeHtml(event.eventType)}" data-venue-name="${escapeHtml(event.venueName)}" data-suburb="${escapeHtml(event.suburb || "")}">${escapeHtml(presentation.action.label)}</a>`
    : "";
  const imageUrl = eventImageUrl(event);
  const media = imageUrl ? `<div class="event-pill-media"><img class="event-pill-media-backdrop" src="${escapeHtml(imageUrl)}" alt="" aria-hidden="true" loading="lazy" decoding="async"><img class="event-pill-media-artwork" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(`${event.title} event artwork`)}" loading="lazy" decoding="async"></div>` : "";
  const heading = detailUrl ? `<a href="${detailUrl}">${escapeHtml(event.title)}</a>` : escapeHtml(event.title);
  return `<article class="event-pill event-listing-card${imageUrl ? " has-image" : ""}">${media}
    <div class="event-pill-content"><p class="event-pill-venue">${escapeHtml(event.eventType)} &middot; ${escapeHtml(event.venueName)}</p><h2 class="event-pill-title">${heading}</h2>
    <div class="event-pill-meta"><span>${escapeHtml(formatEventDate(event))}</span><span>${escapeHtml(formatEventTime(event))}</span>${event.suburb ? `<span>${escapeHtml(event.suburb)}</span>` : ""}</div>${status}
    <p class="event-pill-description">${escapeHtml(eventDescription(event))}</p></div>
    <div class="event-pill-actions">${detailUrl ? `<a class="event-page-link" href="${detailUrl}">Event details</a>` : ""}${booking}</div></article>`;
}

export async function onRequestGet({ env }) {
  try {
    const expanded = await getUpcomingPublicEvents(env.DB);
    const seen = new Set();
    const events = expanded.filter((event) => event.slug && !seen.has(event.slug) && seen.add(event.slug));
    const content = events.length ? events.map(eventCard).join("") : '<p class="events-empty">New Shemotion dates are coming soon.</p>';
    const body = `<main id="top"><section class="events page-hero section-pad"><div class="section-heading"><p class="eyebrow">Upcoming events</p><h1>Shemotion Classes &amp; Workshops</h1><p>Feminine movement meditation experiences across the Gold Coast.</p></div><div class="events-page-grid">${content}</div><p class="page-back-link"><a href="/">Back to Shemotion home</a></p></section></main>`;
    return htmlResponse(pageDocument({ title: "Shemotion Events | Gold Coast Women's Movement Experiences", description: "Discover upcoming Shemotion feminine movement meditation events, workshops and women's experiences across the Gold Coast.", canonical: `${SITE_URL}/events/`, body }), 200, "no-store");
  } catch {
    return htmlResponse(pageDocument({ title: "Shemotion Events", description: "Upcoming Shemotion events on the Gold Coast.", canonical: `${SITE_URL}/events/`, body: '<main><section class="page-hero section-pad"><div class="section-heading"><h1>Upcoming Shemotion Events</h1><p>Events are temporarily unavailable. Please check back soon.</p></div></section></main>' }), 500);
  }
}
