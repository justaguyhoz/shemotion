/** @OnlyCurrentDoc */
// REVIEW DRAFT ONLY. Never include in the serving bridge or deploy as a web app.
// Changing this constant requires a separately approved production rollout.
const PRODUCTION_OUTREACH_WRITES_APPROVED_ = false;
const PRODUCTION_OUTREACH_TARGET_ = '1Sh2_8DwOKiROgIo8H9WDH3nVMBa-eZctEijB8MhV0BQ';
const PRODUCTION_OUTREACH_TAB_ = 65444517;
const PRODUCTION_OUTREACH_HEADERS_ = ['Priority', 'Target', 'Category', 'Contact person', 'Contact route', 'Email / Form', 'Website', 'Pitch angle', 'Desired outcome', 'Status', 'Draft date', 'Sent date', 'Follow-up date', 'Response / outcome', 'Coverage / backlink URL', 'Notes', 'Stream', 'Outcome Type', 'Response Date', 'Last Activity Date', 'activity_id'];

function productionOutreachContext_() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet || spreadsheet.getId() !== PRODUCTION_OUTREACH_TARGET_) throw new Error('production_target_refused');
  var owner = spreadsheet.getOwner();
  var email = Session.getEffectiveUser().getEmail();
  if (!owner || !email || owner.getEmail() !== email) throw new Error('production_owner_required');
  var sheet = spreadsheet.getSheetByName('Outreach Tracker');
  if (!sheet || sheet.getSheetId() !== PRODUCTION_OUTREACH_TAB_ || sheet.getLastRow() >= 5000 ||
      sheet.getLastColumn() !== 21) throw new Error('production_structure_refused');
  var protectedId = sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE).some(function (protection) {
    var range = protection.getRange();
    return range.getColumn() === 21 && range.getNumColumns() === 1 && range.getRow() === 1 &&
      range.getNumRows() >= sheet.getMaxRows() && !protection.isWarningOnly() && protection.canEdit() &&
      !protection.canDomainEdit() && protection.getEditors().every(function (user) { return user.getEmail() === email; });
  });
  if (!protectedId) throw new Error('owner_only_id_protection_required');
  return { sheet: sheet, properties: PropertiesService.getScriptProperties() };
}

function productionOutreachHash_(value) {
  return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(value)));
}

function productionOutreachValidation_(rule) {
  if (!rule) return null;
  return [String(rule.getCriteriaType()), rule.getCriteriaValues().map(function (value) {
    if (value && typeof value.getA1Notation === 'function') return [value.getSheet().getName(), value.getA1Notation()];
    return value;
  }), rule.getAllowInvalid(), rule.getHelpText()];
}

function productionOutreachSnapshot_(sheet) {
  var range = sheet.getDataRange();
  var values = range.getDisplayValues();
  var formulas = range.getFormulas();
  if (JSON.stringify(values[0]) !== JSON.stringify(PRODUCTION_OUTREACH_HEADERS_)) throw new Error('production_headers_refused');
  var audit = inspectOutreachIds_(values);
  if (!audit.headerPresent || formulas.some(function (row) { return Boolean(row[20]); })) {
    throw new Error('production_identity_invalid');
  }
  var cells = [range.getValues(), values, formulas, range.getNotes(), range.getNumberFormats(),
    range.getBackgrounds(), range.getFontColors(), range.getFontWeights(), range.getFontSizes(),
    range.getHorizontalAlignments(), range.getVerticalAlignments(),
    range.getDataValidations().map(function (row) { return row.map(productionOutreachValidation_); })];
  var business = cells.map(function (matrix) { return matrix.map(function (row) { return row.slice(0, 20); }); });
  return { values: values, audit: audit, fingerprint: productionOutreachHash_(cells), businessHash: productionOutreachHash_(business) };
}

function dryRunProductionOutreachIds() {
  var context = productionOutreachContext_();
  context.properties.deleteProperty('OUTREACH_PRODUCTION_DRY_RUN');
  context.properties.deleteProperty('OUTREACH_PRODUCTION_APPROVED_SNAPSHOT');
  var snapshot = productionOutreachSnapshot_(context.sheet);
  if (!snapshot.audit.errors.length) context.properties.setProperty('OUTREACH_PRODUCTION_DRY_RUN', JSON.stringify({ fingerprint: snapshot.fingerprint, at: Date.now() }));
  var result = { mode: 'dry_run', blocked: Boolean(snapshot.audit.errors.length), cellWrites: 0,
    snapshot: snapshot.audit.errors.length ? null : snapshot.fingerprint, audit: outreachIdAuditSummary_(snapshot.audit) };
  console.log(JSON.stringify(result));
  return result;
}

function backfillProductionOutreachIds() { return assignProductionOutreachIds_('initial_backfill'); }
function assignNewProductionOutreachIds() { return assignProductionOutreachIds_('new_records'); }

function assignProductionOutreachIds_(mode) {
  // Refuse BEFORE touching SpreadsheetApp, properties or the production target.
  if (!PRODUCTION_OUTREACH_WRITES_APPROVED_) throw new Error('production_writes_release_locked');
  if (mode !== 'initial_backfill' && mode !== 'new_records') throw new Error('production_mode_refused');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw new Error('production_lock_unavailable');
  var attempted = 0;
  try {
    var context = productionOutreachContext_();
    var props = context.properties;
    var before = productionOutreachSnapshot_(context.sheet);
    if (before.audit.errors.length) throw new Error('production_identity_invalid');
    var initialized = props.getProperty('OUTREACH_PRODUCTION_INITIALIZED') === 'true';
    if (!before.audit.missingRows.length && initialized) return { mode: mode, assigned: 0, status: 'unchanged' };
    var planRecord = JSON.parse(props.getProperty('OUTREACH_PRODUCTION_DRY_RUN') || 'null');
    var age = planRecord ? Date.now() - planRecord.at : NaN;
    if (!planRecord || !Number.isFinite(age) || age < 0 || age > 15 * 60 * 1000 ||
        planRecord.fingerprint !== before.fingerprint ||
        props.getProperty('OUTREACH_PRODUCTION_APPROVED_SNAPSHOT') !== before.fingerprint ||
        props.getProperty('OUTREACH_PRODUCTION_WRITE_CONFIRM') !== 'ASSIGN_BLANK_IDS_ONLY') {
      throw new Error('fresh_reviewed_production_plan_required');
    }
    if (mode === 'initial_backfill' && initialized) throw new Error('initial_backfill_already_complete');
    if (mode === 'new_records') {
      var rows = JSON.parse(props.getProperty('OUTREACH_PRODUCTION_NEW_ROWS') || '[]');
      if (!initialized || !Array.isArray(rows) || rows.some(function (row) { return !Number.isInteger(row) || row < 2; }) ||
          JSON.stringify(rows.slice().sort(function (a, b) { return a - b; })) !== JSON.stringify(before.audit.missingRows)) {
        throw new Error('confirm_genuinely_new_records');
      }
    }
    var plan = planOutreachIds_(before.values, function () { return Utilities.getUuid(); });
    if (plan.blocked || plan.writes.some(function (write) { return write.column !== 21 || write.row < 2; }) ||
        productionOutreachSnapshot_(context.sheet).fingerprint !== before.fingerprint) throw new Error('production_plan_changed');
    props.deleteProperty('OUTREACH_PRODUCTION_DRY_RUN');
    props.deleteProperty('OUTREACH_PRODUCTION_APPROVED_SNAPSHOT');
    props.deleteProperty('OUTREACH_PRODUCTION_WRITE_CONFIRM');
    plan.writes.forEach(function (write) {
      var cell = context.sheet.getRange(write.row, 21);
      if (cell.getValue() !== '' || cell.getFormula()) throw new Error('production_cell_not_blank');
      attempted++;
      cell.setValue(write.value);
    });
    SpreadsheetApp.flush();
    var after = productionOutreachSnapshot_(context.sheet);
    if (after.businessHash !== before.businessHash || after.audit.errors.length || after.audit.missingRows.length ||
        before.values.some(function (row, index) { return row[20] && after.values[index][20] !== row[20]; }) ||
        plan.writes.some(function (write) { return after.values[write.row - 1][20] !== write.value; })) {
      throw new Error('production_post_write_integrity_failed');
    }
    props.setProperty('OUTREACH_PRODUCTION_INITIALIZED', 'true');
    props.deleteProperty('OUTREACH_PRODUCTION_NEW_ROWS');
    var result = { mode: mode, status: 'complete', assigned: plan.writes.length, businessUnchanged: true, audit: outreachIdAuditSummary_(after.audit) };
    console.log(JSON.stringify(result));
    return result;
  } catch (error) {
    console.log(JSON.stringify({ mode: mode, status: 'blocked_or_partial', attemptedCellWrites: attempted }));
    throw new Error('production_assignment_stopped_review_snapshot');
  } finally { lock.releaseLock(); }
}
