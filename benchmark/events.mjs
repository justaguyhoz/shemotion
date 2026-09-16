import { performance } from "node:perf_hooks";
import { expandRecurringEvents } from "../recurrence.js";
import { fixtures, NOW, YEAR_END, measureExpansion } from "./event-fixtures.js";

function timing(events, start, end) {
  for (let index = 0; index < 50; index += 1) expandRecurringEvents(events, start, end);
  const samples = [];
  for (let batch = 0; batch < 15; batch += 1) {
    const before = performance.now();
    for (let index = 0; index < 50; index += 1) expandRecurringEvents(events, start, end);
    samples.push((performance.now() - before) / 50);
  }
  samples.sort((a, b) => a - b);
  return { medianMs: Number(samples[7].toFixed(4)), minMs: Number(samples[0].toFixed(4)), maxMs: Number(samples.at(-1).toFixed(4)) };
}

const published = fixtures.filter((value) => value.isPublished);
const cases = [
  ["representative-public-year", published, NOW, YEAR_END],
  ["admin-six-week-window", fixtures, "2026-08-31T00:00:00.000Z", "2026-10-11T23:59:59.999Z"],
  ["long-weekly-public-year", [fixtures[4]], NOW, YEAR_END],
  ["old-series-over-520-cap", [fixtures[13]], NOW, YEAR_END],
  ["expired-monthly-detail-upcoming", [fixtures[14]], NOW, YEAR_END],
  ["expired-monthly-detail-history", [fixtures[14]], fixtures[14].startAt, NOW],
];
console.log(JSON.stringify({ clock: NOW, node: process.version,
  note: "Local recurrence CPU only; no network/DB timing. Enumeration counters are separate from timing. No production data or writes.",
  cases: cases.map(([name, events, start, end]) => ({ name,
    ...measureExpansion(expandRecurringEvents, events, start, end), ...timing(events, start, end) })),
}, null, 2));
