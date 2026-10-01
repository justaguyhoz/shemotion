import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { eventBookingPresentation, eventBookingState } from "../event-booking.js";
import { getUpcomingPublicEvents } from "../shared/event-store.js";
import { eventJsonLd } from "../shared/public-pages.js";
import { rowToPublicEvent, validateEventInput } from "../shared/events.js";
import { onRequestGet as getEventPage } from "../functions/events/[slug].js";

const FUTURE = "2099-10-20T08:00:00.000Z";

function event(overrides = {}) {
  return {
    id: 1,
    slug: "release-and-reconnect-tallai",
    title: "Release & Reconnect",
    eventType: "Workshop",
    venueName: "Sky Temple",
    suburb: "Tallai",
    address: "1 Example Road, Tallai QLD 4213",
    dateStatus: "scheduled",
    startAt: FUTURE,
    endAt: "2099-10-20T10:00:00.000Z",
    timezone: "Australia/Brisbane",
    audience: "Women only",
    shortDescription: "A guided feminine movement meditation experience.",
    bookingLabel: "Reserve your place",
    bookingUrl: "https://events.example.com/release",
    availabilityStatus: "Booking open",
    imageUrl: "/assets/meditation.jpg",
    isPublished: true,
    displayOrder: 0,
    recurrenceFrequency: "none",
    recurrenceUntil: null,
    locationId: null,
    ...overrides,
  };
}

function row(overrides = {}) {
  const value = event();
  return {
    id: value.id,
    slug: value.slug,
    title: value.title,
    event_type: value.eventType,
    venue_name: value.venueName,
    suburb: value.suburb,
    address: value.address,
    date_status: value.dateStatus,
    start_at: value.startAt,
    end_at: value.endAt,
    timezone: value.timezone,
    audience: value.audience,
    short_description: value.shortDescription,
    booking_label: value.bookingLabel,
    booking_url: value.bookingUrl,
    availability_status: value.availabilityStatus,
    image_url: value.imageUrl,
    recurrence_frequency: value.recurrenceFrequency,
    recurrence_until: value.recurrenceUntil,
    display_order: value.displayOrder,
    location_id: value.locationId,
    latitude: null,
    longitude: null,
    google_maps_url: null,
    updated_at: "2099-01-01 00:00:00",
    ...overrides,
  };
}

function detailEnv(value) {
  return { DB: { prepare: () => ({ bind: () => ({ first: async () => value }) }) } };
}

test("booking-state presentation keeps date state independent from CTA state", () => {
  const comingSoon = event({ availabilityStatus: "Coming soon", bookingUrl: null });
  assert.equal(comingSoon.dateStatus, "scheduled");
  assert.equal(eventBookingState(comingSoon), "coming_soon");
  assert.deepEqual(eventBookingPresentation(comingSoon), {
    state: "coming_soon", statusLabel: "Coming Soon", action: null,
  });

  const open = event();
  assert.deepEqual(eventBookingPresentation(open).action, {
    href: open.bookingUrl, label: "Reserve your place",
  });
  assert.equal(eventBookingPresentation(event({ availabilityStatus: "No booking required" })).action, null);
  assert.equal(eventBookingPresentation(event({ availabilityStatus: "Sold out", bookingUrl: null })).action, null);
  assert.deepEqual(eventBookingPresentation(event({ availabilityStatus: "Sold out", bookingLabel: "Book now" })).action, {
    href: "https://events.example.com/release", label: "Join Waitlist",
  });
  assert.equal(eventBookingPresentation(event({ availabilityStatus: "Sold out", bookingLabel: "Join the waitlist" })).action.label, "Join the waitlist");
});

test("event validation requires a real URL only for open booking states", () => {
  const open = validateEventInput(event({ bookingUrl: null }));
  assert.ok(open.errors.some((message) => message.includes("required when booking is open")));

  for (const availabilityStatus of ["Coming soon", "Sold out", "No booking required", "Cancelled"]) {
    const result = validateEventInput(event({ availabilityStatus, bookingUrl: null, bookingLabel: "" }));
    assert.equal(result.errors, undefined, availabilityStatus);
  }

  const custom = validateEventInput(event({ bookingLabel: "Join the experience" }));
  assert.equal(custom.event.bookingLabel, "Join the experience");

  const soldOutWaitlist = validateEventInput(event({ availabilityStatus: "Sold out", bookingLabel: "Book now" }));
  assert.equal(soldOutWaitlist.event.bookingLabel, "Join Waitlist");
});

test("published Coming Soon and TBC records stay upcoming while cancelled records do not", async () => {
  const db = {
    prepare: () => ({
      all: async () => ({ results: [
        row({ id: 1, availability_status: "Coming soon", booking_url: null }),
        row({ id: 2, slug: "date-tbc", date_status: "tbc", start_at: null, end_at: null, availability_status: "Coming soon", booking_url: null }),
        row({ id: 3, slug: "cancelled", availability_status: "Cancelled" }),
      ] }),
    }),
  };
  const values = await getUpcomingPublicEvents(db, "2099-10-01T00:00:00.000Z");
  assert.deepEqual(values.map(({ id }) => id), [1, 2]);
});

test("event detail CTA and status follow Booking Open, Coming Soon, Sold Out and No Booking Required", async () => {
  const openResponse = await getEventPage({ env: detailEnv(row()), params: { slug: "release-and-reconnect-tallai" } });
  const openHtml = await openResponse.text();
  assert.match(openHtml, />Reserve your place<\/a>/);
  assert.match(openHtml, /data-event-booking/);

  const comingResponse = await getEventPage({ env: detailEnv(row({ availability_status: "Coming soon", booking_url: null, booking_label: "Coming Soon" })), params: { slug: "release-and-reconnect-tallai" } });
  const comingHtml = await comingResponse.text();
  assert.match(comingHtml, /<dt>Booking<\/dt><dd>Coming Soon<\/dd>/);
  assert.doesNotMatch(comingHtml, /data-event-booking|>Book Now</);
  assert.doesNotMatch(comingHtml.match(/<div class="event-detail-actions">[\s\S]*?<\/div>/)?.[0] || "", /Contact Shemotion/);

  const soldResponse = await getEventPage({ env: detailEnv(row({ availability_status: "Sold out", booking_url: null })), params: { slug: "release-and-reconnect-tallai" } });
  const soldHtml = await soldResponse.text();
  assert.match(soldHtml, /<dt>Booking<\/dt><dd>Sold Out<\/dd>/);
  assert.doesNotMatch(soldHtml, /data-event-booking/);

  const noBookingResponse = await getEventPage({ env: detailEnv(row({ availability_status: "No booking required", booking_url: null })), params: { slug: "release-and-reconnect-tallai" } });
  const noBookingHtml = await noBookingResponse.text();
  assert.match(noBookingHtml, /<dt>Booking<\/dt><dd>No Booking Required<\/dd>/);
  assert.doesNotMatch(noBookingHtml, /data-event-booking/);
});

test("Event JSON-LD never invents an offer for Coming Soon and retains valid bookable offers", () => {
  const coming = eventJsonLd(event({ availabilityStatus: "Coming soon", bookingUrl: null }), "https://shemotion.com.au/events/release/", "2099-10-01T00:00:00.000Z");
  assert.equal(Object.hasOwn(coming, "offers"), false);

  const staleUrlComing = eventJsonLd(event({ availabilityStatus: "Coming soon" }), "https://shemotion.com.au/events/release/", "2099-10-01T00:00:00.000Z");
  assert.equal(Object.hasOwn(staleUrlComing, "offers"), false);

  const open = eventJsonLd(event(), "https://shemotion.com.au/events/release/", "2099-10-01T00:00:00.000Z");
  assert.equal(open.offers.url, "https://events.example.com/release");
  assert.equal(open.image, "https://shemotion.com.au/assets/meditation.jpg");
});

test("event imagery is optional in data, cards and detail pages", async () => {
  assert.equal(rowToPublicEvent(row()).imageUrl, "/assets/meditation.jpg");
  assert.equal(rowToPublicEvent(row({ image_url: null })).imageUrl, null);

  const withImage = await (await getEventPage({ env: detailEnv(row()), params: { slug: "release-and-reconnect-tallai" } })).text();
  assert.match(withImage, /class="event-detail-media"/);
  assert.match(withImage, /src="\/assets\/meditation\.jpg"/);

  const withoutImage = await (await getEventPage({ env: detailEnv(row({ image_url: null })), params: { slug: "release-and-reconnect-tallai" } })).text();
  assert.doesNotMatch(withoutImage, /class="event-detail-media"/);
});

test("event-card artwork uses a responsive landscape frame without cropping important content", async () => {
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  const script = await readFile(new URL("../script.js", import.meta.url), "utf8");
  assert.match(css, /\.event-pill-media\s*\{[\s\S]*aspect-ratio:\s*4 \/ 3;/);
  assert.match(css, /\.event-pill-media-artwork\s*\{[\s\S]*object-fit:\s*contain;/);
  assert.match(css, /\.event-pill-media-backdrop,[\s\S]*object-fit:\s*cover;/);
  assert.match(css, /@media \(max-width: 560px\)[\s\S]*\.event-pill-media/);
  assert.match(script, /className: "event-pill-media"/);
  assert.doesNotMatch(script, /swiper|slick|embla/i);
});
