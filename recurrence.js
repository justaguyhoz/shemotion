export const RECURRENCE_OPTIONS = ["none", "weekly", "fortnightly", "monthly"];

const BRISBANE_OFFSET_MS = 10 * 60 * 60 * 1000;

function addMonthsBrisbane(iso, months) {
  const local = new Date(Date.parse(iso) + BRISBANE_OFFSET_MS);
  const day = local.getUTCDate();
  const target = new Date(local);
  target.setUTCDate(1);
  target.setUTCMonth(target.getUTCMonth() + months);
  const daysInMonth = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  if (day > daysInMonth) return null;
  target.setUTCDate(day);
  return new Date(target.getTime() - BRISBANE_OFFSET_MS).toISOString();
}

function nextOccurrence(iso, frequency) {
  if (frequency === "weekly" || frequency === "fortnightly") {
    const days = frequency === "weekly" ? 7 : 14;
    return new Date(Date.parse(iso) + days * 86400000).toISOString();
  }
  for (let offset = 1; offset <= 12; offset += 1) {
    const next = addMonthsBrisbane(iso, offset);
    if (next) return next;
  }
  return null;
}

export function expandRecurringEvents(events, rangeStart, rangeEnd) {
  const startMs = Date.parse(rangeStart);
  const endMs = Date.parse(rangeEnd);
  const expanded = [];

  events.forEach((event) => {
    if (event.dateStatus === "tbc" || !event.startAt) {
      expanded.push(event);
      return;
    }
    const frequency = event.recurrenceFrequency || "none";
    if (frequency === "none") {
      const eventEnd = Date.parse(event.endAt || event.startAt);
      if (eventEnd >= startMs && Date.parse(event.startAt) <= endMs) expanded.push(event);
      return;
    }

    const duration = event.endAt ? Date.parse(event.endAt) - Date.parse(event.startAt) : null;
    const recurrenceEnd = event.recurrenceUntil ? Date.parse(`${event.recurrenceUntil}T13:59:59.999Z`) : endMs;
    let occurrenceStart = event.startAt;
    for (let index = 0; index < 520 && occurrenceStart; index += 1) {
      const occurrenceMs = Date.parse(occurrenceStart);
      if (occurrenceMs > endMs || occurrenceMs > recurrenceEnd) break;
      const occurrenceEnd = duration === null ? null : new Date(occurrenceMs + duration).toISOString();
      if (Date.parse(occurrenceEnd || occurrenceStart) >= startMs) {
        expanded.push({
          ...event,
          id: `${event.id}-${occurrenceMs}`,
          seriesId: event.id,
          startAt: occurrenceStart,
          endAt: occurrenceEnd,
          isRecurringOccurrence: true,
        });
      }
      occurrenceStart = nextOccurrence(occurrenceStart, frequency);
    }
  });

  return expanded.sort((a, b) => {
    if (a.dateStatus === "tbc") return 1;
    if (b.dateStatus === "tbc") return -1;
    return Date.parse(a.startAt) - Date.parse(b.startAt) || (a.displayOrder || 0) - (b.displayOrder || 0);
  });
}
