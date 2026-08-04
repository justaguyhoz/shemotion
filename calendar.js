const TIMEZONE = "Australia/Brisbane";

export function eventDateKey(iso) {
  if (!iso) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: TIMEZONE,
  }).formatToParts(new Date(iso));
  const value = (type) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function monthGrid(year, month) {
  const first = new Date(Date.UTC(year, month, 1));
  const mondayOffset = (first.getUTCDay() + 6) % 7;
  const start = new Date(Date.UTC(year, month, 1 - mondayOffset));
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    const dateYear = date.getUTCFullYear();
    const dateMonth = date.getUTCMonth();
    const day = date.getUTCDate();
    return {
      key: `${dateYear}-${String(dateMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      day,
      inMonth: dateMonth === month,
    };
  });
}

export function initialCalendarMonth(events, now = new Date()) {
  const firstScheduled = events.find((event) => event.dateStatus !== "tbc" && event.startAt);
  const key = eventDateKey(firstScheduled?.startAt || now.toISOString());
  const [year, month] = key.split("-").map(Number);
  return { year, month: month - 1 };
}

export function moveMonth(current, amount) {
  const date = new Date(Date.UTC(current.year, current.month + amount, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
}

export function monthLabel({ year, month }) {
  return new Intl.DateTimeFormat("en-AU", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month, 1)));
}
