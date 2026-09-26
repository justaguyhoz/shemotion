import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createContext, runInContext } from "node:vm";
import { createHash } from "node:crypto";
import { sanitizeOutreachSnapshot } from "../shared/outreach.js";
import { outreachFacts } from "../shared/activity-feed.js";
import { onRequest } from "../functions/api/internal/activity-feed/v1.js";

const root = new URL("../integrations/google-apps-script/", import.meta.url);
const identityCode = await readFile(new URL("outreach-identity.gs", root), "utf8");
const bridgeCode = await readFile(new URL("contact-webhook.gs", root), "utf8");
const rehearsalCode = await readFile(new URL("test-tools/outreach-id-rehearsal.gs", root), "utf8");
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const clone = (value) => JSON.parse(JSON.stringify(value));
const headers = ["Target", "Status", "Priority", "Category", "Contact route", "Website", "Pitch angle", "Desired outcome", "Draft date", "Sent date", "Follow-up date", "Response / outcome", "Coverage / backlink URL", "Stream", "Outcome Type", "Response Date", "Last Activity Date", "activity_id"];
const row = (overrides = {}) => headers.map((header) => ({ Target: "Fixture business", Status: "Sent", "Sent date": "2026-09-20", activity_id: id(1), ...overrides })[header] || "");
function core() {
  const vm = createContext({});
  runInContext(identityCode + "\n" + bridgeCode, vm);
  return vm;
}
function applyPlan(grid, plan) {
  assert.equal(plan.blocked, false);
  const result = clone(grid);
  for (const write of plan.writes) result[write.row - 1][write.column - 1] = write.value;
  return result;
}

function rehearsal(grid, options = {}) {
  const state = { values: clone(grid), formulas: [], writes: [], logs: [], locks: 0 };
  const props = new Map(Object.entries({ OUTREACH_SPREADSHEET_ID: "production-fixture", OUTREACH_ID_TEST_SPREADSHEET_ID: "disposable-fixture", OUTREACH_ID_TEST_SHEET_NAME: "Tracker", OUTREACH_ID_TEST_CONFIRM: "DISPOSABLE_ONLY", ...options.properties }));
  let counter = 100;
  const sheet = {
    getLastRow: () => state.values.length,
    getLastColumn: () => Math.max(...state.values.map((r) => r.length)),
    getDataRange: () => ({ getDisplayValues: () => clone(state.values), getFormulas: () => clone(state.formulas.length ? state.formulas : state.values.map((r) => r.map(() => ""))) }),
    getRange: (r, c) => ({
      getDisplayValue: () => state.values[r - 1]?.[c - 1] || "",
      getFormula: () => state.formulas[r - 1]?.[c - 1] || "",
      setValue(value) {
        if (options.failAfter === state.writes.length) throw new Error("injected write failure");
        state.writes.push({ r, c, value }); state.values[r - 1][c - 1] = value;
      },
    }),
  };
  const vm = createContext({
    console: { log: (text) => state.logs.push(text) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props.get(k) || null, setProperty: (k, v) => props.set(k, v), deleteProperty: (k) => props.delete(k) }) },
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getId: () => options.activeId || "disposable-fixture", getName: () => options.name || "[DISPOSABLE] Outreach IDs", getSheetByName: (name) => name === "Tracker" ? sheet : null }), flush() {} },
    LockService: { getScriptLock: () => ({ tryLock: () => { state.locks++; return !options.lockDenied; }, releaseLock: () => { state.locks--; } }) },
    Utilities: { getUuid: () => id(counter++), DigestAlgorithm: { SHA_256: "sha256" }, computeDigest: (_, text) => [...createHash("sha256").update(text).digest()], base64EncodeWebSafe: (bytes) => Buffer.from(bytes).toString("base64url") },
  });
  runInContext(identityCode + "\n" + rehearsalCode, vm);
  return { vm, state, props };
}

test("backfill plan adds one rightmost activity_id header and IDs only to populated blank-ID rows", () => {
  const vm = core();
  const grid = [headers.slice(0, -1), row().slice(0, -1), Array(17).fill(""), row({ Target: "Second" }).slice(0, -1)];
  let calls = 0;
  const plan = vm.planOutreachIds_(grid, () => id(++calls));
  assert.equal(plan.writes.length, 3);
  assert.equal(plan.writes[0].column, 18);
  assert.equal(plan.writes[0].value, "activity_id");
  const output = applyPlan(grid, plan);
  assert.notEqual(output[1][17], output[3][17]);
  assert.equal(output[2][17], undefined);
  assert.equal(vm.planOutreachIds_(output, () => assert.fail("rerun must not generate")).writes.length, 0);
  assert.deepEqual(grid[1].slice(0, 17), output[1].slice(0, 17));
});

test("every mutable business field and row order leave persisted UUID and feed identity unchanged", () => {
  const vm = core();
  const original = [headers, row(), row({ Target: "Second", activity_id: id(2) })];
  const expected = vm.trackerRowsFromValues_(original)[0].activityId;
  for (const header of headers.slice(0, -1)) {
    const changed = clone(original);
    changed[1][headers.indexOf(header)] = "Edited business field";
    const reordered = [changed[0], changed[2], changed[1]];
    const plan = vm.planOutreachIds_(reordered, () => assert.fail("existing ID regeneration"));
    assert.equal(plan.writes.length, 0, header);
    const records = clone(vm.trackerRowsFromValues_(reordered));
    assert.equal(records[1].activityId, expected, header);
    const payload = { ok: true, action: "outreach_snapshot", tracker: { rows: records } };
    assert.equal(outreachFacts(payload, new Date("2026-09-26T00:00:00Z"))[1].sourceId, `shemotion:outreach:${expected}`);
  }
});

test("duplicate, malformed, whitespace, formula, duplicate-header and wrong-sheet data block before UUID generation", () => {
  const vm = core();
  const fixtures = [
    [headers, row(), row({ activity_id: id(1).toUpperCase() })],
    [headers, row({ activity_id: "private@example.test" })],
    [headers, row({ activity_id: " " })],
    [headers, row({ activity_id: '=UUID()' })],
    [[...headers, "activity_id"], row()],
    [["Unrelated", "activity_id"], ["other", ""]],
  ];
  for (const grid of fixtures) {
    const plan = vm.planOutreachIds_(grid, () => assert.fail("blocked plan must not generate"));
    assert.equal(plan.blocked, true);
    assert.equal(plan.writes.length, 0);
    assert.throws(() => vm.trackerRowsFromValues_(grid), /identity_validation_failed/);
  }
});

test("invalid generator results and UUID collisions fail without a write plan", () => {
  const vm = core();
  for (const generate of [() => "invalid", () => id(1)]) assert.throws(() => vm.planOutreachIds_([headers, row(), row({ activity_id: "" })], generate), /generator_invalid_or_collision/);
});

test("legacy bridge remains unchanged without the header; sanitized IDs are validated and pass through", () => {
  const vm = core();
  const legacy = clone(vm.trackerRowsFromValues_([headers.slice(0, -1), row().slice(0, -1)]));
  assert.equal(Object.hasOwn(legacy[0], "activityId"), false);
  const identified = clone(vm.trackerRowsFromValues_([headers, row()]));
  const output = sanitizeOutreachSnapshot({ ok: true, tracker: { rows: identified } });
  assert.equal(output.tracker.rows[0].activityId, id(1));
  for (const rows of [[{ target: "Test", activityId: "private@example.test" }], [...identified, ...identified], [...identified, { target: "missing" }]]) assert.throws(() => sanitizeOutreachSnapshot({ ok: true, tracker: { rows } }));
  assert.equal(vm.safeErrorCode_(vm.publicError_("identity_validation_failed")), "identity_validation_failed");
});

test("disposable dry-run performs no writes; backfill is idempotent and preserves every existing valid cell", () => {
  const { vm, state } = rehearsal([headers, row(), row({ activity_id: "" }), Array(18).fill("")]);
  assert.equal(vm.dryRunTestOutreachIds().audit.rowsNeedingIds, 1);
  assert.equal(state.writes.length, 0);
  const before = clone(state.values[1]);
  assert.equal(vm.backfillTestOutreachIds().assigned, 1);
  assert.deepEqual(state.values[1], before);
  assert.equal(vm.backfillTestOutreachIds().assigned, 0);
  assert.equal(state.writes.length, 1);
  assert.equal(state.locks, 0);
});

test("production/scope guards reject before reads or writes, even with a test confirmation", () => {
  for (const options of [{ activeId: "production-fixture" }, { properties: { OUTREACH_ID_TEST_SPREADSHEET_ID: "production-fixture" }, activeId: "production-fixture" }, { name: "Real tracker" }, { properties: { OUTREACH_SPREADSHEET_ID: "" } }, { properties: { OUTREACH_ID_TEST_CONFIRM: "" } }]) {
    const { vm, state } = rehearsal([headers, row({ activity_id: "" })], options);
    assert.throws(() => vm.dryRunTestOutreachIds(), /gate_failed/);
    assert.throws(() => vm.backfillTestOutreachIds(), /gate_failed/);
    assert.equal(state.writes.length, 0);
  }
});

test("edits after dry-run and ID formulas fail closed; errors never replace existing IDs", () => {
  const { vm, state } = rehearsal([headers, row({ activity_id: "" })]);
  vm.dryRunTestOutreachIds();
  state.values[1][0] = "Changed after review";
  assert.throws(() => vm.backfillTestOutreachIds());
  assert.equal(state.writes.length, 0);
  state.formulas = state.values.map((r) => r.map(() => ""));
  state.formulas[1][17] = '=UUID()';
  assert.throws(() => vm.dryRunTestOutreachIds(), /formula_forbidden/);
});

test("copied rows require operator correction and explicit new-record approval; never auto-repair duplicate IDs", () => {
  const { vm, state, props } = rehearsal([headers, row({ activity_id: "" })]);
  vm.dryRunTestOutreachIds(); vm.backfillTestOutreachIds();
  state.values.push(clone(state.values[1]));
  assert.equal(vm.dryRunTestOutreachIds().blocked, true);
  assert.throws(() => vm.assignNewTestOutreachIds());
  state.values[2][17] = ""; // Explicit operator confirmation: this copy is a new record.
  vm.dryRunTestOutreachIds();
  assert.throws(() => vm.backfillTestOutreachIds());
  assert.throws(() => vm.assignNewTestOutreachIds());
  props.set("OUTREACH_ID_TEST_NEW_ROWS", "[3]");
  assert.equal(vm.assignNewTestOutreachIds().assigned, 1);
  assert.notEqual(state.values[1][17], state.values[2][17]);
  assert.equal(vm.assignNewTestOutreachIds().assigned, 0);
});

test("partial write failure preserves assigned IDs and produces sanitized audit output", () => {
  const options = { failAfter: 1 };
  const { vm, state } = rehearsal([headers, row({ activity_id: "", Target: "private@example.test secret pitch" }), row({ activity_id: "" })], options);
  vm.dryRunTestOutreachIds();
  assert.throws(() => vm.backfillTestOutreachIds());
  assert.equal(state.values[1][17], id(100));
  assert.equal(vm.dryRunTestOutreachIds().audit.rowsNeedingIds, 1);
  options.failAfter = undefined;
  assert.equal(vm.backfillTestOutreachIds().assigned, 1);
  assert.equal(state.values[1][17], id(100));
  assert.doesNotMatch(state.logs.join(""), /private@example|secret pitch|production-fixture|00000000-/);
  assert.equal(state.locks, 0);
});

test("bridge inspects the complete raw ID grid, rejects formulas and detects records beyond the formatted cap", () => {
  for (const scenario of ["valid", "formula", "beyond_cap", "reordered"]) {
    const vm = core();
    let reads = 0;
    vm.ScriptApp = { getOAuthToken: () => "fixture-only" };
    vm.UrlFetchApp = { fetch(url) {
      reads++;
      let values = [headers, row(), row({ activity_id: id(2) })];
      if (reads === 2) {
        assert.ok(decodeURIComponent(url).includes("!A1:ZZ?"));
        assert.ok(url.includes("valueRenderOption=FORMULA"));
        if (scenario === "formula") values[1][17] = '=UUID()';
        if (scenario === "reordered") values = [headers, values[2], values[1]];
        if (scenario === "beyond_cap") values = [headers, row(), ...Array.from({ length: 5000 }, () => Array(18).fill("")), row()];
      }
      return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ values }) };
    } };
    if (scenario === "valid") assert.equal(vm.readTrackerRows_("fixture", "Tracker").length, 2);
    else assert.throws(() => vm.readTrackerRows_("fixture", "Tracker"));
    assert.equal(reads, 2);
  }
});

test("UUID deletion never causes identity reuse; cap cannot conceal duplicate records", () => {
  const vm = core();
  const grid = [headers, row({ activity_id: id(2) }), row({ activity_id: "" })];
  const result = applyPlan(grid, vm.planOutreachIds_(grid, () => id(3)));
  assert.equal(result[2][17], id(3));
  assert.throws(() => vm.trackerRowsFromValues_([headers, ...Array.from({ length: 5000 }, (_, n) => row({ activity_id: id(n + 1) }))]), /identity_validation_failed/);
});

test("exported HTTP entry point is release-locked regardless of credentials or environment flags", async () => {
  const response = onRequest({ request: new Request("https://example.test/api/internal/activity-feed/v1"), env: new Proxy({}, { get() { assert.fail("release lock must not read secrets or data"); } }) });
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "not_found" });
  const manifest = JSON.parse(await readFile(new URL("appsscript.json", root), "utf8"));
  assert.ok(manifest.oauthScopes.includes("https://www.googleapis.com/auth/spreadsheets.readonly"));
  assert.ok(!manifest.oauthScopes.includes("https://www.googleapis.com/auth/spreadsheets"));
  assert.doesNotMatch(bridgeCode, /setValue\(|appendRow\(|backfillTest|assignNewTest/);
});
