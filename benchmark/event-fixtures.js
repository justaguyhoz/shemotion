// Fixed clock and representative records; never connected to production D1.
export const NOW = "2026-09-16T00:00:00.000Z";
export const YEAR_END = "2027-09-17T00:00:00.000Z";

export function event(id, overrides = {}) {
  return {
    id, slug: `fixture-${id}`, title: `Fixture ${id}`, eventType: "Class",
    venueName: "Fixture venue", suburb: "Tallai", address: "1 Example Road",
    dateStatus: "scheduled", startAt: "2026-09-20T00:00:00.000Z", endAt: null,
    timezone: "Australia/Brisbane", audience: "Women only", shortDescription: "",
    bookingLabel: "Book now", bookingUrl: "https://example.com/book",
    availabilityStatus: "Available", recurrenceFrequency: "none", recurrenceUntil: null,
    displayOrder: 0, isPublished: true, ...overrides,
  };
}

export const fixtures = [
  event(1),
  event(2, { startAt: "2026-08-01T00:00:00.000Z" }),
  event(3, { startAt: "2026-09-01T00:00:00.000Z", recurrenceFrequency: "weekly" }),
  event(4, { startAt: "2026-01-30T23:00:00.000Z", recurrenceFrequency: "monthly" }),
  event(5, { startAt: "2020-01-01T00:00:00.000Z", recurrenceFrequency: "weekly" }),
  event(6, { availabilityStatus: "Cancelled" }),
  event(7, { isPublished: false }),
  event(8, { dateStatus: "tbc", startAt: null }),
  event(9, { startAt: "2026-09-15T21:00:00.001Z" }),
  event(10, { startAt: "2026-09-15T21:00:00.000Z" }),
  event(11, { startAt: "2026-09-14T00:00:00.000Z", endAt: "2026-09-15T23:00:00.001Z" }),
  event(12, { startAt: "2026-09-14T00:00:00.000Z", endAt: "2026-09-15T23:00:00.000Z" }),
  event(13, { startAt: "2026-12-31T13:30:00.000Z", endAt: "2026-12-31T15:00:00.000Z", recurrenceFrequency: "fortnightly", recurrenceUntil: "2027-02-01" }),
  event(14, { startAt: "2010-01-01T00:00:00.000Z", recurrenceFrequency: "weekly" }),
  event(15, { startAt: "2020-01-01T00:00:00.000Z", recurrenceFrequency: "monthly", recurrenceUntil: "2021-12-31" }),
  event(16, { startAt: "2028-01-01T00:00:00.000Z" }),
];

// Spread enumeration happens once for each generated recurring occurrence.
// Instrument the input, not the production implementation. Time plain inputs separately.
export function measureExpansion(expand, events, start, end) {
  let generated = 0;
  const inputs = events.map((value) => new Proxy(value, {
    ownKeys(target) { generated += 1; return Reflect.ownKeys(target); },
  }));
  const retained = expand(inputs, start, end);
  const retainedRecurring = retained.filter((value) => value.isRecurringOccurrence).length;
  return { inputRows: events.length, generated, retained: retained.length,
    retainedRecurring, discardedOccurrences: generated - retainedRecurring,
    listingRows: new Set(retained.filter((value) => value.slug).map((value) => value.slug)).size };
}
