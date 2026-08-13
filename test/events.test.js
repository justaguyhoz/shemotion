import test from "node:test";
import assert from "node:assert/strict";
import { announcementFor, eventActionLabel, eventDestination, eventGoogleMapsUrl } from "../script.js";
import { validateEventInput } from "../shared/events.js";
import { verifyAccessRequest } from "../shared/access.js";
import { onRequestGet as getPublicEvents } from "../functions/api/events.js";
import { eventDateKey, monthGrid, moveMonth } from "../calendar.js";
import { expandRecurringEvents } from "../recurrence.js";
import { rowToLocation, validateLocationInput } from "../shared/locations.js";
import { onRequestPost as createLocation } from "../functions/api/admin/locations/index.js";
import { onRequestPut as updateLocation } from "../functions/api/admin/locations/[id].js";

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
  recurrenceFrequency: "none",
  recurrenceUntil: null,
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
  assert.equal(eventActionLabel(baseEvent), "Email Shemotion");
  assert.equal(eventDestination({ ...baseEvent, availabilityStatus: "Cancelled" }), null);
  const bookable = { ...baseEvent, bookingUrl: "https://example.com/class" };
  assert.equal(eventDestination(bookable), "https://example.com/class");
  assert.equal(eventActionLabel(bookable), "Book with Reinvigr8");
  assert.equal(eventActionLabel({ ...bookable, bookingLabel: "" }), "Venue details");
});

test("event map links prefer saved URLs and otherwise include venue and address", () => {
  const exact = "https://maps.google.com/?cid=123";
  assert.equal(eventGoogleMapsUrl({ ...baseEvent, googleMapsUrl: exact }), exact);
  const fallback = eventGoogleMapsUrl({
    ...baseEvent,
    address: "Unit 3/76 Ferry Rd, Southport QLD 4215",
    suburb: "Southport",
    venueName: "Gold Coast Salsa",
  });
  assert.match(decodeURIComponent(fallback), /Gold Coast Salsa/);
  assert.match(decodeURIComponent(fallback), /Unit 3\/76 Ferry Rd/);
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

test("event descriptions are optional", () => {
  const result = validateEventInput({ ...baseEvent, shortDescription: "" });
  assert.equal(result.errors, undefined);
  assert.equal(result.event.shortDescription, "");
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
    suburb: baseEvent.suburb, address: "1 Example Street, Helensvale QLD 4212", date_status: baseEvent.dateStatus,
    start_at: baseEvent.startAt, end_at: null, timezone: baseEvent.timezone,
    audience: baseEvent.audience, short_description: baseEvent.shortDescription,
    booking_label: baseEvent.bookingLabel, booking_url: null, availability_status: baseEvent.availabilityStatus,
    google_maps_url: "https://maps.google.com/?cid=123", latitude: -27.9, longitude: 153.3,
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
  assert.equal(body.events[0].address, row.address);
  assert.equal(body.events[0].googleMapsUrl, row.google_maps_url);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.match(sql, /address/);
  assert.match(sql, /is_published = 1/);
  assert.match(sql, /date_status = 'tbc'/);
  assert.match(sql, /start_at ASC/);
  assert.ok(Number.isFinite(Date.parse(boundNow)));
});

test("calendar utilities use Brisbane dates and Monday-first months", () => {
  assert.equal(eventDateKey("2026-08-18T23:15:00.000Z"), "2026-08-19");
  const days = monthGrid(2026, 7);
  assert.equal(days.length, 42);
  assert.equal(days[0].key, "2026-07-27");
  assert.deepEqual(moveMonth({ year: 2026, month: 11 }, 1), { year: 2027, month: 0 });
});

test("weekly recurring events expand into dated occurrences", () => {
  const recurring = { ...baseEvent, recurrenceFrequency: "weekly", recurrenceUntil: "2026-09-02" };
  const occurrences = expandRecurringEvents(
    [recurring],
    "2026-08-18T00:00:00.000Z",
    "2026-09-03T00:00:00.000Z"
  );
  assert.equal(occurrences.length, 3);
  assert.ok(occurrences.every((event) => event.seriesId === baseEvent.id));
});

test("recurrence validation rejects an end before the first event", () => {
  const result = validateEventInput({
    ...baseEvent,
    recurrenceFrequency: "weekly",
    recurrenceUntil: "2026-08-01",
  });
  assert.ok(result.errors.some((error) => error.includes("on or after")));
});

test("saved locations require reusable venue details", () => {
  const invalid = validateLocationInput({ name: "Stellar Studio Collective", address: "" });
  assert.ok(invalid.errors.some((error) => error.includes("address")));
  const valid = validateLocationInput({
    name: " Stellar Studio Collective ",
    suburb: " Helensvale ",
    address: " Unit 11/5 Philip Gray Rd, Helensvale QLD 4212 ",
  });
  assert.deepEqual(valid.location, {
    name: "Stellar Studio Collective",
    suburb: "Helensvale",
    address: "Unit 11/5 Philip Gray Rd, Helensvale QLD 4212",
    latitude: null,
    longitude: null,
    googleMapsUrl: null,
  });
});

test("saved location rows retain optional map coordinates", () => {
  assert.deepEqual(rowToLocation({
    id: 3, name: "Stellar", suburb: "Helensvale", address: "1 Example Road",
    latitude: -27.9, longitude: 153.3, google_maps_url: "https://maps.google.com/?cid=123",
  }), {
    id: 3, name: "Stellar", suburb: "Helensvale", address: "1 Example Road",
    latitude: -27.9, longitude: 153.3, googleMapsUrl: "https://maps.google.com/?cid=123",
  });
});

test("saved location validation accepts coordinate pairs and rejects unsafe map URLs", () => {
  const valid = validateLocationInput({
    name: "Gold Coast Salsa", suburb: "Southport",
    address: "Unit 3/76 Ferry Rd, Southport QLD 4215",
    latitude: -27.98, longitude: 153.41,
    googleMapsUrl: "https://maps.google.com/?cid=123",
  });
  assert.equal(valid.errors, undefined);
  const invalid = validateLocationInput({
    name: "Gold Coast Salsa", address: "Unit 3/76 Ferry Rd",
    latitude: -27.98, googleMapsUrl: "https://example.com/not-maps",
  });
  assert.ok(invalid.errors.some((error) => error.includes("together")));
  assert.ok(invalid.errors.some((error) => error.includes("Google Maps")));
});

test("admin can create and update complete saved location geography", async () => {
  const savedRow = {
    id: 4, name: "Gold Coast Salsa", suburb: "Southport",
    address: "Unit 3/76 Ferry Rd, Southport QLD 4215",
    latitude: -27.97, longitude: 153.41,
    google_maps_url: "https://maps.google.com/?cid=123",
  };
  const statements = [];
  const env = {
    DB: {
      prepare(sql) {
        const statement = { sql, values: [] };
        statements.push(statement);
        return {
          bind(...values) {
            statement.values = values;
            return {
              first: async () => sql.includes("SELECT") ? null : savedRow,
            };
          },
        };
      },
    },
  };
  const payload = {
    name: savedRow.name, suburb: savedRow.suburb, address: savedRow.address,
    latitude: savedRow.latitude, longitude: savedRow.longitude,
    googleMapsUrl: savedRow.google_maps_url,
  };
  const created = await createLocation({
    env,
    request: new Request("https://example.com", { method: "POST", body: JSON.stringify(payload) }),
  });
  assert.equal(created.status, 201);
  assert.equal((await created.json()).location.googleMapsUrl, savedRow.google_maps_url);
  assert.match(statements.at(-1).sql, /google_maps_url/);

  const updated = await updateLocation({
    env, params: { id: "4" },
    request: new Request("https://example.com/4", { method: "PUT", body: JSON.stringify(payload) }),
  });
  assert.equal(updated.status, 200);
  assert.deepEqual(statements.at(-1).values.slice(3, 6), [savedRow.latitude, savedRow.longitude, savedRow.google_maps_url]);
});
