const TRACKER_FIELDS = [
  "priority",
  "target",
  "category",
  "contactRoute",
  "website",
  "pitchAngle",
  "desiredOutcome",
  "status",
  "draftDate",
  "sentDate",
  "followUpDate",
  "responseOutcome",
  "coverageBacklinkUrl",
  "stream",
  "outcomeType",
  "responseDate",
  "lastActivityDate",
];

function safeText(value, maximumLength = 2000) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maximumLength);
}

function safeTimestamp(value) {
  const text = safeText(value, 64);
  const date = new Date(text);
  return text && !Number.isNaN(date.valueOf()) ? date.toISOString() : "";
}

export function sanitizeOutreachSnapshot(payload) {
  if (!payload || payload.ok !== true) throw new Error("Invalid outreach response");

  const sourceRows = Array.isArray(payload.tracker?.rows) ? payload.tracker.rows.slice(0, 5000) : [];
  const identified = sourceRows.some((row) => Object.hasOwn(row || {}, "activityId"));
  const ids = new Set();
  const rows = sourceRows.map((source) => {
    const row = {};
    for (const field of TRACKER_FIELDS) row[field] = safeText(source?.[field]);
    if (identified) {
      const id = source?.activityId;
      if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) || ids.has(id.toLowerCase())) throw new Error("Invalid outreach identity");
      ids.add(id.toLowerCase());
      row.activityId = id;
    }
    return row;
  }).filter((row) => Object.values(row).some(Boolean));

  const sourceEnquiries = Array.isArray(payload.enquiries?.items)
    ? payload.enquiries.items.slice(0, 2000)
    : [];
  const items = sourceEnquiries.map((source) => ({
    timestamp: safeTimestamp(source?.timestamp),
    category: safeText(source?.category, 120),
  })).filter((item) => item.timestamp && item.category);

  return {
    generatedAt: safeTimestamp(payload.generatedAt) || new Date().toISOString(),
    tracker: { rowCount: rows.length, rows },
    enquiries: { count: items.length, items },
  };
}
