/** @OnlyCurrentDoc */
// Copy only this file and outreach-identity.gs into a DISPOSABLE bound script.
// No deployment, onEdit trigger, web entry point, or production mode exists.
function testOutreachIdContext_() {
  var properties = PropertiesService.getScriptProperties();
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var production = properties.getProperty('OUTREACH_SPREADSHEET_ID');
  var testId = properties.getProperty('OUTREACH_ID_TEST_SPREADSHEET_ID');
  if (!spreadsheet || !production || !testId || testId === production || spreadsheet.getId() !== testId ||
      spreadsheet.getName().indexOf('[DISPOSABLE]') !== 0 || properties.getProperty('OUTREACH_ID_TEST_CONFIRM') !== 'DISPOSABLE_ONLY') {
    throw new Error('disposable_sheet_gate_failed');
  }
  var sheet = spreadsheet.getSheetByName(properties.getProperty('OUTREACH_ID_TEST_SHEET_NAME'));
  if (!sheet || sheet.getLastRow() > 5000 || sheet.getLastColumn() > 702) throw new Error('disposable_sheet_invalid');
  return { properties: properties, sheet: sheet };
}

function testOutreachIdSnapshot_(sheet) {
  var range = sheet.getDataRange();
  var values = range.getDisplayValues();
  var formulas = range.getFormulas();
  var audit = inspectOutreachIds_(values);
  if (audit.headerPresent && formulas.some(function (row) { return Boolean(row[audit.column]); })) {
    throw new Error('identity_formula_forbidden');
  }
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify([values, formulas]));
  var fingerprint = Utilities.base64EncodeWebSafe(digest);
  return { values: values, audit: audit, fingerprint: fingerprint };
}

function dryRunTestOutreachIds() {
  var context = testOutreachIdContext_();
  var snapshot = testOutreachIdSnapshot_(context.sheet);
  if (snapshot.audit.errors.length) context.properties.deleteProperty('OUTREACH_ID_TEST_DRY_RUN');
  else context.properties.setProperty('OUTREACH_ID_TEST_DRY_RUN', snapshot.fingerprint);
  var result = { mode: 'dry_run', blocked: Boolean(snapshot.audit.errors.length), audit: outreachIdAuditSummary_(snapshot.audit) };
  console.log(JSON.stringify(result));
  return result;
}

function backfillTestOutreachIds() { return applyTestOutreachIds_('initial_backfill'); }
function assignNewTestOutreachIds() { return applyTestOutreachIds_('new_records'); }

function applyTestOutreachIds_(mode) {
  var context = testOutreachIdContext_();
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw new Error('identity_lock_unavailable');
  var attempted = 0;
  try {
    var snapshot = testOutreachIdSnapshot_(context.sheet);
    if (snapshot.audit.errors.length) throw new Error('identity_validation_failed');
    if (!snapshot.audit.missingRows.length && snapshot.audit.headerPresent) return { mode: mode, assigned: 0, status: 'unchanged' };
    if (context.properties.getProperty('OUTREACH_ID_TEST_DRY_RUN') !== snapshot.fingerprint) throw new Error('fresh_dry_run_required');
    var initialized = context.properties.getProperty('OUTREACH_ID_TEST_INITIALIZED') === 'true';
    if (mode === 'initial_backfill' && initialized) throw new Error('backfill_already_completed_use_explicit_new_records');
    if (mode === 'new_records') {
      if (!initialized) throw new Error('initial_backfill_required');
      var confirmed = JSON.parse(context.properties.getProperty('OUTREACH_ID_TEST_NEW_ROWS') || '[]');
      if (!Array.isArray(confirmed) || confirmed.some(function (row) { return !Number.isInteger(row) || row < 2; }) ||
          JSON.stringify(confirmed.slice().sort(function (a, b) { return a - b; })) !== JSON.stringify(snapshot.audit.missingRows)) {
        throw new Error('confirm_only_genuinely_new_rows');
      }
    }
    // Generate and validate the complete plan before making the first cell write.
    var plan = planOutreachIds_(snapshot.values, function () { return Utilities.getUuid(); });
    if (plan.blocked || testOutreachIdSnapshot_(context.sheet).fingerprint !== snapshot.fingerprint) throw new Error('sheet_changed_rerun_dry_run');
    context.properties.deleteProperty('OUTREACH_ID_TEST_DRY_RUN');
    plan.writes.forEach(function (write) {
      var cell = context.sheet.getRange(write.row, write.column);
      if (cell.getDisplayValue() !== '' || cell.getFormula()) throw new Error('cell_no_longer_blank');
      attempted += 1;
      cell.setValue(write.value);
    });
    SpreadsheetApp.flush();
    var after = testOutreachIdSnapshot_(context.sheet);
    if (after.audit.errors.length || after.audit.missingRows.length) throw new Error('post_write_validation_failed');
    context.properties.setProperty('OUTREACH_ID_TEST_INITIALIZED', 'true');
    context.properties.deleteProperty('OUTREACH_ID_TEST_NEW_ROWS');
    var result = { mode: mode, status: 'complete', assigned: snapshot.audit.missingRows.length, audit: outreachIdAuditSummary_(after.audit) };
    console.log(JSON.stringify(result));
    return result;
  } catch (error) {
    // No cell contents, source IDs, source URLs, PII or raw exception details in audit output.
    console.log(JSON.stringify({ mode: mode, status: 'blocked_or_partial', attemptedCellWrites: attempted }));
    throw new Error('identity_rehearsal_stopped_rerun_dry_run');
  } finally { lock.releaseLock(); }
}
