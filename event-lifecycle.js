const HOUR_MS = 60 * 60 * 1000;

function instant(value) {
  const timestamp = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function eventPastAt(event) {
  if (!event || event.dateStatus === "tbc") return null;

  const endAt = instant(event.endAt);
  if (endAt !== null) return new Date(endAt + HOUR_MS).toISOString();

  const startAt = instant(event.startAt);
  return startAt === null ? null : new Date(startAt + 3 * HOUR_MS).toISOString();
}

export function isEventPast(event, now = new Date()) {
  const pastAt = eventPastAt(event);
  const nowAt = instant(now);
  return pastAt !== null && nowAt !== null && nowAt >= Date.parse(pastAt);
}
