import test from "node:test";
import assert from "node:assert/strict";
import { announcementFor, eventDestination } from "../script.js";
import { validateEventInput } from "../shared/events.js";
import { verifyAccessRequest } from "../shared/access.js";
import { onRequestGet as getPublicEvents } from "../functions/api/events.js";

const baseEvent = {
  id: 1,
  title: "Special Introductory Class",
  eventType: "Class",
  venueName: "Reinvigr8 Gym",
  suburb: "Helensvale",
  dateStatus: "scheduled",
  startAt: "2026-08-18T23:15:00.000Z",
  endAt: null,
  timezone: "Australia/Brisbane",
  audience: "Women only",
  shortDescription: "A supportive movement experience.",
  bookingLabel: "Book with Reinvigr8",
  bookingUrl: null,
  availabilityStatus: "Limited spaces",
  isPublished: true,
  displayOrder: 0,
};

test("one event creates a detailed announcement", () => {
  const announcement = announcementFor([baseEvent]);
  assert.equal(
    announcement.text,
    "Upcoming Shemotion Class - Reinvigr8 Gym, Helensvale - Wednesday 19 August at 9.15am"
  );
});

test("multiple and no events update announcement state", () => {
  assert.equal(announcementFor([]), null);
  assert.deepEqual(announcementFor([baseEvent, { ...baseEvent, id: 2 }]), {
    text: "Upcoming Shemotion Experiences - View Dates and Locations",
    action: "View Dates",
  });
});

test("event pills use the venue link or Shemotion email without dead booking controls", () => {
  assert.equal(eventDestination(baseEvent), "mailto:shemotion.au@gmail.com");
  assert.equal(eventDestination({ ...baseEvent, availabilityStatus: "Cancelled" }), null);
  assert.equal(eventDestination({ ...baseEvent, bookingUrl: "https://example.com/class" }), "https://example.com/class");
});

test("admin validation rejects invalid URLs and dates", () => {
  const invalid = validateEventInput({ ...baseEvent, bookingUrl: "http://example.com", startAt: "tomorrow" });
  assert.ok(invalid.errors.some((error) => error.includes("https")));
  assert.ok(invalid.errors.some((error) => error.includes("startAt")));
});

test("events can be published with a date to be confirmed", () => {
  const result = validateEventInput({ ...baseEvent, dateStatus: "tbc", startAt: null });
  assert.equal(result.event.dateStatus, "tbc");
  assert.equal(result.event.startAt, null);
  assert.match(announcementFor([result.event]).text, /Date to be confirmed/);
});

test("SQL injection-like text remains plain event data", () => {
  const title = "Class'); DROP TABLE events; --";
  const result = validateEventInput({ ...baseEvent, title });
  assert.equal(result.event.title, title);
});

test("unauthenticated admin requests are rejected", async () => {
  const result = await verifyAccessRequest({
    request: new Request("https://example.com/api/admin/events"),
    env: {
      ACCESS_TEAM_DOMAIN: "https://example.cloudflareaccess.com",
      ACCESS_AUD: "audience",
      ADMIN_EMAILS: "shemotion.au@gmail.com",
    },
  });
  assert.equal(result.response.status, 401);
});

test("public API uses future published filtering and ordered results", async () => {
  let sql = "";
  let boundNow = "";
  const row = {
    id: 1, title: baseEvent.title, event_type: baseEvent.eventType, venue_name: baseEvent.venueName,
    suburb: baseEvent.suburb, date_status: baseEvent.dateStatus, start_at: baseEvent.startAt, end_at: null, timezone: baseEvent.timezone,
    audience: baseEvent.audience, short_description: baseEvent.shortDescription,
    booking_label: baseEvent.bookingLabel, booking_url: null, availability_status: baseEvent.availabilityStatus,
  };
  const env = {
    DB: {
      prepare(query) {
        sql = query;
        return {
          bind(value) {
            boundNow = value;
            return { all: async () => ({ results: [row] }) };
          },
        };
      },
    },
  };
  const response = await getPublicEvents({ env });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.events.length, 1);
  assert.match(sql, /is_published = 1/);
  assert.match(sql, /date_status = 'tbc'/);
  assert.match(sql, /start_at ASC/);
  assert.ok(Number.isFinite(Date.parse(boundNow)));
});
