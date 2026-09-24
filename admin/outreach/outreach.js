const BRISBANE_TIMEZONE = "Australia/Brisbane";
const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BRISBANE_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const displayDateFormatter = new Intl.DateTimeFormat("en-AU", {
  timeZone: BRISBANE_TIMEZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
});

function dateKey(value) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "";
  return dateFormatter.format(date);
}

function shiftDays(key, amount) {
  const date = new Date(`${key}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function periodBounds(period, now = new Date(), custom = {}) {
  const today = dateKey(now.toISOString());
  if (period === "7") return { start: shiftDays(today, -6), end: today };
  if (period === "30") return { start: shiftDays(today, -29), end: today };
  if (period === "month") return { start: `${today.slice(0, 7)}-01`, end: today };
  if (period === "custom") {
    const start = dateKey(custom.start);
    const end = dateKey(custom.end);
    return start && end && start <= end ? { start, end } : null;
  }
  return { start: "", end: "" };
}

export function recordActivityDate(record) {
  return dateKey(
    record.lastActivityDate ||
    record.responseDate ||
    record.sentDate ||
    record.draftDate ||
    record.followUpDate
  );
}

function withinBounds(value, bounds) {
  if (!bounds || (!bounds.start && !bounds.end)) return true;
  const key = dateKey(value);
  return Boolean(key && key >= bounds.start && key <= bounds.end);
}

export function filterSnapshot(snapshot, bounds) {
  return {
    rows: snapshot.tracker.rows.filter((row) => withinBounds(recordActivityDate(row), bounds)),
    enquiries: snapshot.enquiries.items.filter((item) => withinBounds(item.timestamp, bounds)),
  };
}

export function summarise(rows, enquiries) {
  return {
    opportunities: rows.length,
    sent: rows.filter((row) => row.sentDate).length,
    responses: rows.filter((row) => row.responseDate || row.responseOutcome || row.outcomeType).length,
    positive: rows.filter((row) => row.outcomeType.toLowerCase() === "positive" || row.status.toLowerCase() === "won").length,
    enquiries: enquiries.length,
  };
}

function countBy(items, valueForItem, emptyLabel) {
  const counts = new Map();
  for (const item of items) {
    const label = valueForItem(item) || emptyLabel;
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  return [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
}

function element(tag, { className, text } = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderBreakdown(container, values) {
  container.replaceChildren();
  if (!values.length) {
    container.append(element("p", { text: "No records in this period." }));
    return;
  }
  for (const [label, count] of values) {
    const row = element("div", { className: "breakdown-row" });
    row.append(element("span", { text: label }), element("strong", { text: String(count) }));
    container.append(row);
  }
}

function renderMetrics(summary) {
  const metrics = [
    ["Opportunities", summary.opportunities],
    ["Sent", summary.sent],
    ["Responses", summary.responses],
    ["Positive outcomes", summary.positive],
    ["Website enquiries", summary.enquiries],
  ];
  const container = document.querySelector("[data-metrics]");
  container.replaceChildren(...metrics.map(([label, value]) => {
    const card = element("article", { className: "metric" });
    card.append(element("strong", { text: String(value) }), element("span", { text: label }));
    return card;
  }));
}

function displayDate(value) {
  const key = dateKey(value);
  return key ? displayDateFormatter.format(new Date(`${key}T12:00:00Z`)) : "—";
}

function renderRecords(rows) {
  const body = document.querySelector("[data-records]");
  body.replaceChildren();
  document.querySelector("[data-record-count]").textContent = `${rows.length} record${rows.length === 1 ? "" : "s"}`;
  if (!rows.length) {
    const row = element("tr");
    const cell = element("td", { className: "empty-row", text: "No opportunity records in this period." });
    cell.colSpan = 9;
    row.append(cell);
    body.append(row);
    return;
  }

  for (const record of rows) {
    const row = element("tr");
    const status = element("span", { className: "status-pill", text: record.status || "—" });
    const values = [
      record.priority || "—",
      record.target || "—",
      record.stream || "Other / unmapped",
      status,
      displayDate(record.sentDate),
      record.outcomeType || "—",
      displayDate(record.responseDate),
      displayDate(record.lastActivityDate),
      record.responseOutcome || "—",
    ];
    values.forEach((value) => {
      const cell = element("td");
      cell.append(value instanceof Node ? value : document.createTextNode(value));
      row.append(cell);
    });
    body.append(row);
  }
}

let snapshot;
let customBounds = {};

function render() {
  const period = document.querySelector("[data-date-filter]").value;
  const bounds = periodBounds(period, new Date(), customBounds);
  if (!bounds) return;
  const filtered = filterSnapshot(snapshot, bounds);
  renderMetrics(summarise(filtered.rows, filtered.enquiries));
  renderBreakdown(
    document.querySelector("[data-stream-breakdown]"),
    countBy(filtered.rows, (row) => row.stream, "Other / unmapped")
  );
  renderBreakdown(
    document.querySelector("[data-outcome-breakdown]"),
    countBy(filtered.rows.filter((row) => row.outcomeType), (row) => row.outcomeType, "Not recorded")
  );
  renderBreakdown(
    document.querySelector("[data-enquiry-breakdown]"),
    countBy(filtered.enquiries, (item) => item.category, "Other")
  );
  renderRecords(filtered.rows);
}

async function loadDashboard() {
  const status = document.querySelector("[data-dashboard-status]");
  try {
    const response = await fetch("../../api/admin/outreach", {
      cache: "no-store",
      headers: { accept: "application/json" },
    });
    if (!response.ok) throw new Error("Reporting request failed");
    snapshot = await response.json();
    if (!Array.isArray(snapshot.tracker?.rows) || !Array.isArray(snapshot.enquiries?.items)) {
      throw new Error("Reporting response was invalid");
    }
    status.textContent = "";
    document.querySelector("[data-dashboard-content]").hidden = false;
    document.querySelector("[data-last-updated]").textContent = `Updated ${new Date(snapshot.generatedAt).toLocaleString("en-AU", { timeZone: BRISBANE_TIMEZONE })}`;
    render();
  } catch {
    status.textContent = "Outreach reporting could not be loaded. Please try again later.";
    status.classList.add("is-error");
  }
}

function initialise() {
  const filter = document.querySelector("[data-date-filter]");
  const customForm = document.querySelector("[data-custom-range]");
  filter.addEventListener("change", () => {
    customForm.hidden = filter.value !== "custom";
    if (filter.value !== "custom" && snapshot) render();
  });
  customForm.addEventListener("submit", (event) => {
    event.preventDefault();
    customBounds = Object.fromEntries(new FormData(customForm).entries());
    if (snapshot) render();
  });
  loadDashboard();
}

if (typeof document !== "undefined") initialise();
