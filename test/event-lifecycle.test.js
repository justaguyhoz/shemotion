import test from "node:test";
import assert from "node:assert/strict";
import { eventPastAt, isEventPast } from "../event-lifecycle.js";
import { expandRecurringEvents } from "../recurrence.js";
import { getUpcomingPublicEvents } from "../shared/event-store.js";
import { eventJsonLd } from "../shared/public-pages.js";
import { onRequestGet as getEventPage } from "../functions/events/[slug].js";

const baseEvent = {
  id: 42,
  slug: "lifecycle-event-tallai",
  title: "Lifecycle Event",
  eventType: "Workshop",
  venueName: "Example Venue",
  suburb: "Tallai",
  address: "1 Example Road, Tallai QLD 4213",
  dateStatus: "scheduled",
  startAt: "2026-09-18T00:00:00.000Z",
  endAt: null,
  timezone: "Australia/Brisbane",
  audience: "Women only",
  shortDescription: "A guided Shemotion experience.",
  bookingLabel: "Book now",
  bookingUrl: "https://events.example.com/lifecycle",
  availabilityStatus: "Available",
  recurrenceFrequency: "none",
  recurrenceUntil: null,
  displayOrder: 0,
  locationId: null,
  latitude: null,
  longitude: null,
  googleMapsUrl: null,
};

function eventRow(overrides = {}) {
  return {
    id: baseEvent.id,
    slug: baseEvent.slug,
    title: baseEvent.title,
    event_type: baseEvent.eventType,
    venue_name: baseEvent.venueName,
    suburb: baseEvent.suburb,
    address: baseEvent.address,
    date_status: baseEvent.dateStatus,
    start_at: baseEvent.startAt,
    end_at: baseEvent.endAt,
    timezone: baseEvent.timezone,
    audience: baseEvent.audience,
    short_description: baseEvent.shortDescription,
    booking_label: baseEvent.bookingLabel,
    booking_url: baseEvent.bookingUrl,
    availability_status: baseEvent.availabilityStatus,
    recurrence_frequency: baseEvent.recurrenceFrequency,
    recurrence_until: baseEvent.recurrenceUntil,
    display_order: baseEvent.displayOrder,
    location_id: baseEvent.locationId,
    latitude: baseEvent.latitude,
    longitude: baseEvent.longitude,
    google_maps_url: baseEvent.googleMapsUrl,
    updated_at: "2026-09-15 00:00:00",
    ...overrides,
  };
}

function detailEnv(row) {
  return { DB: { prepare: () => ({ bind: () => ({ first: async () => row }) }) } };
}

test("events with an end time become past exactly one hour after the end", () => {
  const event = { ...baseEvent, startAt: "2026-09-18T00:00:00.000Z", endAt: "2026-09-18T01:00:00.000Z" };
  assert.equal(eventPastAt(event), "2026-09-18T02:00:00.000Z");
  assert.equal(isEventPast(event, "2026-09-18T01:59:00.000Z"), false);
  assert.equal(isEventPast(event, "2026-09-18T02:00:00.000Z"), true);
});

test("events without an end time become past exactly three hours after the start", () => {
  const event = { ...baseEvent, startAt: "2026-09-18T00:00:00.000Z", endAt: null };
  assert.equal(eventPastAt(event), "2026-09-18T03:00:00.000Z");
  assert.equal(isEventPast(event, "2026-09-18T02:59:00.000Z"), false);
  assert.equal(isEventPast(event, "2026-09-18T03:00:00.000Z"), true);
});

test("a two-day event uses its finish and never the earlier start fallback", () => {
  const event = {
    ...baseEvent,
    startAt: "2026-09-17T23:00:00.000Z",
    endAt: "2026-09-19T06:00:00.000Z",
  };
  assert.equal(isEventPast(event, "2026-09-18T02:00:00.000Z"), false);
  assert.equal(isEventPast(event, "2026-09-19T06:59:00.000Z"), false);
  assert.equal(isEventPast(event, "2026-09-19T07:00:00.000Z"), true);
});

test("TBC events do not become past from missing dates", () => {
  const event = { ...baseEvent, dateStatus: "tbc", startAt: null, endAt: null };
  assert.equal(eventPastAt(event), null);
  assert.equal(isEventPast(event, "2099-01-01T00:00:00.000Z"), false);
});

test("recurring occurrences apply the lifecycle rule to each occurrence", () => {
  const recurring = {
    ...baseEvent,
    startAt: "2026-09-01T00:00:00.000Z",
    endAt: null,
    recurrenceFrequency: "weekly",
    recurrenceUntil: "2026-09-15",
  };
  const occurrences = expandRecurringEvents(
    [recurring],
    "2026-09-01T03:00:00.000Z",
    "2026-09-16T00:00:00.000Z"
  );
  assert.deepEqual(occurrences.map((event) => event.startAt), [
    "2026-09-08T00:00:00.000Z",
    "2026-09-15T00:00:00.000Z",
  ]);
  assert.ok(occurrences.every((event) => event.seriesId === baseEvent.id));
});

test("past events disappear from the shared Upcoming event store without deleting records", async () => {
  let sql = "";
  const db = {
    prepare(query) {
      sql = query;
      return {
        all: async () => ({ results: [
          eventRow({ id: 1, slug: "past", start_at: "2026-09-15T00:00:00.000Z", end_at: null }),
          eventRow({ id: 2, slug: "current", start_at: "2026-09-15T06:01:00.000Z", end_at: null }),
          eventRow({ id: 3, slug: "tbc", date_status: "tbc", start_at: null, end_at: null }),
        ] }),
      };
    },
  };
  const events = await getUpcomingPublicEvents(db, "2026-09-15T09:00:00.000Z");
  assert.deepEqual(events.map((event) => event.slug), ["current", "tbc"]);
  assert.match(sql, /is_published = 1/);
  assert.doesNotMatch(sql, /DELETE|UPDATE/i);
});

test("a past published event page stays indexable, shows ended messaging and removes booking", async () => {
  const row = eventRow({
    start_at: "2020-01-03T00:00:00.000Z",
    end_at: "2020-01-04T06:00:00.000Z",
  });
  const response = await getEventPage({ env: detailEnv(row), params: { slug: row.slug } });
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.match(html, /<link rel="canonical" href="https:\/\/shemotion\.com\.au\/events\/lifecycle-event-tallai\/">/);
  assert.match(html, /This event has ended\./);
  assert.match(html, />View upcoming Shemotion events<\/a>/);
  assert.match(html, /Lifecycle Event/);
  assert.match(html, /Example Venue/);
  assert.match(html, /<dt>Availability<\/dt><dd>Ended<\/dd>/);
  assert.doesNotMatch(html, /data-event-booking|https:\/\/events\.example\.com\/lifecycle/);
  assert.doesNotMatch(html, /<meta name="robots" content="noindex">/);

  const schema = JSON.parse(html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)[1]);
  assert.equal(schema.startDate, row.start_at);
  assert.equal(schema.endDate, row.end_at);
  assert.equal(schema.eventStatus, "https://schema.org/EventScheduled");
  assert.equal(Object.hasOwn(schema, "offers"), false);
});

test("past Event JSON-LD suppresses stale offers without inventing a past status", () => {
  const event = { ...baseEvent, startAt: "2020-01-01T00:00:00.000Z", endAt: null };
  const schema = eventJsonLd(event, "https://shemotion.com.au/events/lifecycle-event-tallai/", "2020-01-01T03:00:00.000Z");
  assert.equal(schema.eventStatus, "https://schema.org/EventScheduled");
  assert.equal(Object.hasOwn(schema, "offers"), false);
});

test("cancelled future events remain cancelled, not past, and cannot be booked", async () => {
  const row = eventRow({
    start_at: "2099-01-03T00:00:00.000Z",
    end_at: "2099-01-03T02:00:00.000Z",
    availability_status: "Cancelled",
  });
  const response = await getEventPage({ env: detailEnv(row), params: { slug: row.slug } });
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /<dt>Availability<\/dt><dd>Cancelled<\/dd>/);
  assert.doesNotMatch(html, /This event has ended\.|data-event-booking|https:\/\/events\.example\.com\/lifecycle/);
});
