import { eventPastAt, isEventPast } from "../event-lifecycle.js";
import { expandRecurringEvents } from "../recurrence.js";

export const ADMIN_EVENT_FILTERS = new Set(["active", "drafts", "past", "all"]);

const TEN_YEARS_MS = 10 * 365 * 24 * 60 * 60 * 1000;

function timestamp(value) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function recurrenceRangeEnd(event, nowAt) {
  if (event.recurrenceUntil) return `${event.recurrenceUntil}T13:59:59.999Z`;
  return new Date(nowAt + TEN_YEARS_MS).toISOString();
}

function lastRecurringOccurrence(event, rangeEnd) {
  const occurrences = expandRecurringEvents([event], event.startAt, rangeEnd);
  return occurrences.at(-1) || event;
}

export function adminEventTiming(event, now = new Date()) {
  const nowAt = timestamp(now);
  const nowIso = nowAt === null ? new Date().toISOString() : new Date(nowAt).toISOString();

  if (event.dateStatus === "tbc" || !event.startAt) {
    return { isPast: false, displayStartAt: null, pastAt: null };
  }

  if ((event.recurrenceFrequency || "none") !== "none") {
    const rangeEnd = recurrenceRangeEnd(event, nowAt ?? Date.now());
    const currentOrUpcoming = expandRecurringEvents([event], nowIso, rangeEnd)[0];
    if (currentOrUpcoming) {
      return {
        isPast: false,
        displayStartAt: currentOrUpcoming.startAt,
        pastAt: null,
      };
    }

    const lastOccurrence = lastRecurringOccurrence(event, rangeEnd);
    return {
      isPast: isEventPast(lastOccurrence, nowIso),
      displayStartAt: lastOccurrence.startAt,
      pastAt: eventPastAt(lastOccurrence),
    };
  }

  return {
    isPast: isEventPast(event, nowIso),
    displayStartAt: event.startAt,
    pastAt: eventPastAt(event),
  };
}

export function eventMatchesAdminSearch(event, search = "") {
  const query = search.trim().toLocaleLowerCase("en-AU");
  if (!query) return true;
  return [event.title, event.venueName, event.suburb]
    .filter(Boolean)
    .some((value) => String(value).toLocaleLowerCase("en-AU").includes(query));
}

function displayOrder(event) {
  const value = Number(event.displayOrder);
  return Number.isFinite(value) ? value : 0;
}

function compareDisplayOrder(a, b) {
  return displayOrder(a.event) - displayOrder(b.event) || a.index - b.index;
}

function compareScheduled(a, b) {
  return timestamp(a.timing.displayStartAt) - timestamp(b.timing.displayStartAt)
    || compareDisplayOrder(a, b);
}

function comparePast(a, b) {
  return (timestamp(b.timing.pastAt) ?? Number.NEGATIVE_INFINITY)
    - (timestamp(a.timing.pastAt) ?? Number.NEGATIVE_INFINITY)
    || compareDisplayOrder(a, b);
}

function category(item) {
  if (item.timing.isPast) return 2;
  return item.timing.displayStartAt ? 0 : 1;
}

function compareAdminEvents(a, b) {
  const categoryDifference = category(a) - category(b);
  if (categoryDifference) return categoryDifference;
  if (category(a) === 0) return compareScheduled(a, b);
  if (category(a) === 2) return comparePast(a, b);
  return compareDisplayOrder(a, b);
}

export function filterAndSortAdminEvents(input, options = {}) {
  const filter = ADMIN_EVENT_FILTERS.has(options.filter) ? options.filter : "active";
  const now = options.now ?? new Date();
  const prepared = input.map((event, index) => ({
    event,
    index,
    timing: adminEventTiming(event, now),
  }));

  return prepared
    .filter((item) => {
      if (filter === "active") return !item.timing.isPast;
      if (filter === "drafts") return !item.event.isPublished;
      if (filter === "past") return item.timing.isPast;
      return true;
    })
    .filter((item) => eventMatchesAdminSearch(item.event, options.search))
    .sort(compareAdminEvents)
    .map((item) => item.event);
}

export function adminEventCountLabel(count, filter) {
  if (filter === "drafts") return `${count} ${count === 1 ? "draft" : "drafts"}`;
  if (filter === "active") return `${count} active ${count === 1 ? "event" : "events"}`;
  if (filter === "past") return `${count} past ${count === 1 ? "event" : "events"}`;
  return `${count} ${count === 1 ? "event" : "events"}`;
}

export function adminEventEmptyMessage(filter, hasSearch) {
  if (hasSearch) return "No events match your search.";
  if (filter === "drafts") return "No draft events.";
  if (filter === "past") return "No past events yet.";
  if (filter === "all") return "No events yet. Add the first Shemotion experience.";
  return "No active events. Add the next Shemotion experience.";
}
