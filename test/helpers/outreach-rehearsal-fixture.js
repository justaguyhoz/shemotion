// Header-only production observation; every body value below is synthetic.
export const rehearsalHeaders = ["Priority", "Target", "Category", "Contact person", "Contact route", "Email / Form", "Website", "Pitch angle", "Desired outcome", "Status", "Draft date", "Sent date", "Follow-up date", "Response / outcome", "Coverage / backlink URL", "Notes", "Stream", "Outcome Type", "Response Date", "Last Activity Date", "activity_id"];
export const fixtureUuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export function rehearsalRow(target, overrides = {}) {
  const values = { Priority: "High", Target: target, Category: "Editorial / PR", "Contact person": "SYNTHETIC PERSON", "Contact route": "Email", "Email / Form": "fixture@example.test", Website: "https://example.test", "Pitch angle": "SYNTHETIC PRIVATE PITCH", Status: "Sent", "Sent date": "2026-09-20", Notes: "SYNTHETIC PRIVATE NOTE", ...overrides };
  return rehearsalHeaders.map((key) => values[key] || "");
}
export function rehearsalGrid() {
  return [rehearsalHeaders, rehearsalRow("Blank Alpha"), rehearsalRow("Blank Beta"),
    rehearsalRow("Valid Existing", { activity_id: fixtureUuid(1) }),
    rehearsalRow("Duplicate Original", { activity_id: fixtureUuid(2) }),
    rehearsalRow("Duplicate Copy", { activity_id: fixtureUuid(2) }),
    rehearsalRow("Malformed", { activity_id: "not-a-uuid" }), Array(21).fill(""),
    rehearsalRow("Formula Record", { Notes: '="SYNTHETIC "&"FORMULA"' })];
}
