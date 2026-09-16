import test from "node:test";
import assert from "node:assert/strict";
import { expandRecurringEvents } from "../recurrence.js";
import { event, fixtures, NOW, YEAR_END } from "../benchmark/event-fixtures.js";
import { eventDateKey } from "../calendar.js";
import { eventJsonLd } from "../shared/public-pages.js";

const dates = (values) => values.map((value) => value.startAt);

test("monthly recurrence skips missing Brisbane calendar dates without drifting", () => {
  const series = event(1, { startAt: "2026-01-30T23:00:00.000Z", recurrenceFrequency: "monthly" });
  assert.deepEqual(dates(expandRecurringEvents([series], series.startAt, "2026-08-01T00:00:00.000Z")), [
    "2026-01-30T23:00:00.000Z", "2026-03-30T23:00:00.000Z",
    "2026-05-30T23:00:00.000Z", "2026-07-30T23:00:00.000Z",
  ]);
});

test("monthly recurrence retains leap day and skips February in a non-leap year", () => {
  for (const [year, expected] of [[2024, ["2024-01-28T23:00:00.000Z", "2024-02-28T23:00:00.000Z", "2024-03-28T23:00:00.000Z"]],
    [2025, ["2025-01-28T23:00:00.000Z", "2025-03-28T23:00:00.000Z"]]]) {
    const series = event(1, { startAt: `${year}-01-28T23:00:00.000Z`, recurrenceFrequency: "monthly" });
    assert.deepEqual(dates(expandRecurringEvents([series], series.startAt, `${year}-04-01T00:00:00.000Z`)), expected);
  }
});

test("recurrence until includes the final Brisbane day and crosses a year boundary", () => {
  const series = event(1, { startAt: "2026-12-24T13:59:59.999Z", recurrenceFrequency: "weekly", recurrenceUntil: "2026-12-31" });
  const values = expandRecurringEvents([series], series.startAt, "2027-02-01T00:00:00.000Z");
  assert.deepEqual(dates(values), [series.startAt, "2026-12-31T13:59:59.999Z"]);
  assert.equal(eventDateKey(values.at(-1).startAt), "2026-12-31");
  const midnight = { ...series, startAt: "2026-12-24T14:00:00.000Z" };
  assert.equal(expandRecurringEvents([midnight], midnight.startAt, "2027-02-01T00:00:00.000Z").length, 1);
});

test("requested window preserves exact grace boundaries and inclusive upper bound", () => {
  const end = "2026-09-23T00:00:00.000Z";
  const input = [fixtures[8], fixtures[9], fixtures[10], fixtures[11],
    event(30, {startAt: end}), event(31, {startAt: "2026-09-23T00:00:00.001Z"})];
  assert.deepEqual(new Set(expandRecurringEvents(input, NOW, end).map(value => value.id)), new Set([9, 11, 30]));
});

test("recurring grace uses each occurrence end, including multi-day durations", () => {
  const series = event(1, {startAt: "2026-09-01T00:00:00.000Z", endAt: "2026-09-03T00:00:00.000Z", recurrenceFrequency: "weekly"});
  const inside = expandRecurringEvents([series], "2026-09-10T00:59:59.999Z", "2026-09-11T00:00:00.000Z");
  assert.equal(inside.length, 1);
  assert.equal(inside[0].startAt, "2026-09-08T00:00:00.000Z");
  assert.equal(inside[0].endAt, "2026-09-10T00:00:00.000Z");
  assert.equal(expandRecurringEvents([series], "2026-09-10T01:00:00.000Z", "2026-09-11T00:00:00.000Z").length, 0);
});

test("long-running weekly series returns only the requested window and stable identities", () => {
  const values = expandRecurringEvents([fixtures[4]], NOW, "2026-09-30T00:00:00.000Z");
  assert.deepEqual(dates(values), [NOW, "2026-09-23T00:00:00.000Z", "2026-09-30T00:00:00.000Z"]);
  for (const value of values) {
    assert.equal(value.seriesId, 5);
    assert.equal(value.id, `5-${Date.parse(value.startAt)}`);
  }
});

test("TBC remains independent of date windows; cancellation does not delete occurrences", () => {
  const values = expandRecurringEvents([fixtures[7], fixtures[5]], NOW, YEAR_END);
  assert.equal(values.at(-1).dateStatus, "tbc");
  assert.equal(eventJsonLd(values.at(-1), "https://example.com/tbc", NOW), null);
  const cancelled = values[0];
  assert.equal(cancelled.availabilityStatus, "Cancelled");
  assert.equal(eventJsonLd(cancelled, "https://example.com/cancelled", NOW).offers, undefined);
  assert.equal(eventJsonLd(cancelled, "https://example.com/cancelled", NOW).eventStatus, "https://schema.org/EventCancelled");
});

test("same-time occurrences keep display ordering and recurrence does not mutate input", () => {
  const inputs = [event(1, {displayOrder: 2, recurrenceFrequency: "weekly"}), event(2, {displayOrder: -1})];
  const before = structuredClone(inputs);
  const values = expandRecurringEvents(inputs, NOW, inputs[0].startAt);
  assert.deepEqual(values.map(value => value.seriesId || value.id), [2, 1]);
  assert.deepEqual(inputs, before);
});
