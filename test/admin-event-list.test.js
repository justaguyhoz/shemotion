import test from "node:test";
import assert from "node:assert/strict";
import {
  adminEventTiming,
  eventMatchesAdminSearch,
  filterAndSortAdminEvents,
} from "../admin/event-list.js";

const NOW = "2026-10-01T00:00:00.000Z";

function event(id, overrides = {}) {
  return {
    id,
    title: `Event ${id}`,
    venueName: "Shemotion Studio",
    suburb: "Southport",
    dateStatus: "scheduled",
    startAt: "2026-10-10T00:00:00.000Z",
    endAt: null,
    recurrenceFrequency: "none",
    recurrenceUntil: null,
    isPublished: true,
    availabilityStatus: "Available",
    displayOrder: 0,
    ...overrides,
  };
}

test("Active excludes completed events and includes upcoming drafts", () => {
  const values = [
    event(1, { startAt: "2026-09-01T00:00:00.000Z" }),
    event(2, { startAt: "2026-10-03T00:00:00.000Z", isPublished: false }),
    event(3, { startAt: "2026-10-02T00:00:00.000Z" }),
  ];
  assert.deepEqual(
    filterAndSortAdminEvents(values, { filter: "active", now: NOW }).map(({ id }) => id),
    [3, 2]
  );
});

test("Active scheduled events are soonest-first and TBC events follow them", () => {
  const values = [
    event(1, { startAt: "2026-10-08T00:00:00.000Z" }),
    event(2, { dateStatus: "tbc", startAt: null }),
    event(3, { startAt: "2026-10-02T00:00:00.000Z" }),
  ];
  assert.deepEqual(
    filterAndSortAdminEvents(values, { filter: "active", now: NOW }).map(({ id }) => id),
    [3, 1, 2]
  );
});

test("Past events are newest-first using their lifecycle completion time", () => {
  const values = [
    event(1, { startAt: "2026-08-01T00:00:00.000Z" }),
    event(2, { startAt: "2026-09-30T20:00:00.000Z" }),
    event(3, { startAt: "2026-09-20T00:00:00.000Z", endAt: "2026-09-20T03:00:00.000Z" }),
  ];
  assert.deepEqual(
    filterAndSortAdminEvents(values, { filter: "past", now: NOW }).map(({ id }) => id),
    [2, 3, 1]
  );
});

test("Drafts includes unpublished upcoming, TBC and historical events in useful order", () => {
  const values = [
    event(1, { isPublished: false, startAt: "2026-09-01T00:00:00.000Z" }),
    event(2, { isPublished: false, dateStatus: "tbc", startAt: null }),
    event(3, { isPublished: false, startAt: "2026-10-04T00:00:00.000Z" }),
    event(4, { isPublished: true, startAt: "2026-10-02T00:00:00.000Z" }),
    event(5, { isPublished: false, startAt: "2026-09-20T00:00:00.000Z" }),
  ];
  assert.deepEqual(
    filterAndSortAdminEvents(values, { filter: "drafts", now: NOW }).map(({ id }) => id),
    [3, 2, 5, 1]
  );
});

test("search matches title, venue and suburb", () => {
  const values = [
    event(1, { title: "Release and Reconnect", venueName: "Sky Temple", suburb: "Tallai" }),
    event(2, { title: "Morning Practice", venueName: "Harbour Studio", suburb: "Southport" }),
  ];
  assert.equal(eventMatchesAdminSearch(values[0], "release"), true);
  assert.equal(eventMatchesAdminSearch(values[0], "sky temple"), true);
  assert.equal(eventMatchesAdminSearch(values[0], "TALLAI"), true);
  assert.deepEqual(
    filterAndSortAdminEvents(values, { filter: "all", search: "harbour", now: NOW }).map(({ id }) => id),
    [2]
  );
});

test("search combines with the selected filter", () => {
  const values = [
    event(1, { venueName: "Tallai Hall", startAt: "2026-09-01T00:00:00.000Z" }),
    event(2, { venueName: "Tallai Hall", startAt: "2026-10-04T00:00:00.000Z" }),
    event(3, { venueName: "Coastal Studio", startAt: "2026-10-03T00:00:00.000Z" }),
  ];
  assert.deepEqual(
    filterAndSortAdminEvents(values, { filter: "active", search: "Tallai", now: NOW }).map(({ id }) => id),
    [2]
  );
});

test("All includes every event and applies active, TBC, then recent-past ordering", () => {
  const values = [
    event(1, { startAt: "2026-09-01T00:00:00.000Z" }),
    event(2, { dateStatus: "tbc", startAt: null }),
    event(3, { startAt: "2026-10-04T00:00:00.000Z" }),
    event(4, { startAt: "2026-09-20T00:00:00.000Z" }),
  ];
  const result = filterAndSortAdminEvents(values, { filter: "all", now: NOW });
  assert.equal(result.length, values.length);
  assert.deepEqual(result.map(({ id }) => id), [3, 2, 4, 1]);
});

test("admin filtering preserves the existing lifecycle grace boundary", () => {
  const boundary = event(1, { startAt: "2026-10-01T00:00:00.000Z", endAt: null });
  assert.deepEqual(
    filterAndSortAdminEvents([boundary], { filter: "active", now: "2026-10-01T02:59:59.999Z" }).map(({ id }) => id),
    [1]
  );
  assert.deepEqual(
    filterAndSortAdminEvents([boundary], { filter: "past", now: "2026-10-01T03:00:00.000Z" }).map(({ id }) => id),
    [1]
  );
});

test("recurring series stays active and displays its next current occurrence", () => {
  const series = event(1, {
    startAt: "2026-09-01T00:00:00.000Z",
    recurrenceFrequency: "weekly",
    recurrenceUntil: "2026-10-31",
  });
  assert.deepEqual(
    filterAndSortAdminEvents([series], { filter: "active", now: NOW }).map(({ id }) => id),
    [1]
  );
  assert.equal(adminEventTiming(series, NOW).displayStartAt, "2026-10-06T00:00:00.000Z");
});
