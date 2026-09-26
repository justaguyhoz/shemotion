var OUTREACH_ID_HEADER_ = 'activity_id';
var OUTREACH_ID_PATTERN_ = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Pure inspection. Row numbers locate cells for an operator; they are never identity.
function inspectOutreachIds_(values) {
  if (!Array.isArray(values) || !Array.isArray(values[0]) || values.length > 5001) {
    throw new Error('identity_invalid_grid');
  }
  var headers = values[0].map(function (value) { return String(value || '').trim().toLowerCase(); });
  var columns = [];
  headers.forEach(function (value, index) { if (value === OUTREACH_ID_HEADER_) columns.push(index); });
  var errors = [];
  if (columns.length > 1) errors.push({ code: 'duplicate_id_header', row: 1 });
  if (headers.indexOf('target') < 0 || headers.indexOf('status') < 0) errors.push({ code: 'tracker_headers_missing', row: 1 });
  var column = columns.length ? columns[0] : headers.length;
  if (column >= 702) errors.push({ code: 'id_column_outside_bridge_range', row: 1 });
  var ids = Object.create(null);
  var missingRows = [];
  var populatedRows = [];
  values.slice(1).forEach(function (row, index) {
    if (!Array.isArray(row)) { errors.push({ code: 'invalid_row', row: index + 2 }); return; }
    var number = index + 2;
    var raw = columns.length ? row[column] : '';
    var blank = raw === undefined || raw === null || raw === '';
    var populated = row.some(function (cell, i) { return i !== column && String(cell == null ? '' : cell).trim() !== ''; });
    if (populated) populatedRows.push(number);
    if (blank) { if (populated) missingRows.push(number); return; }
    if (typeof raw !== 'string' || !OUTREACH_ID_PATTERN_.test(raw)) {
      errors.push({ code: 'malformed_id', row: number }); return;
    }
    var key = raw.toLowerCase();
    if (ids[key]) errors.push({ code: 'duplicate_id', row: number, firstRow: ids[key] });
    else ids[key] = number;
  });
  return { headerPresent: columns.length === 1, column: column, missingRows: missingRows,
    populatedRows: populatedRows, validIdCount: Object.keys(ids).length, errors: errors, ids: ids };
}

function planOutreachIds_(values, generateUuid) {
  var audit = inspectOutreachIds_(values);
  if (audit.errors.length) return { audit: audit, writes: [], blocked: true };
  var writes = [];
  if (!audit.headerPresent) writes.push({ row: 1, column: audit.column + 1, value: OUTREACH_ID_HEADER_ });
  audit.missingRows.forEach(function (row) {
    var id = generateUuid();
    if (typeof id !== 'string' || !OUTREACH_ID_PATTERN_.test(id) || audit.ids[id.toLowerCase()]) {
      throw new Error('identity_generator_invalid_or_collision');
    }
    audit.ids[id.toLowerCase()] = row;
    writes.push({ row: row, column: audit.column + 1, value: id });
  });
  return { audit: audit, writes: writes, blocked: false };
}

function outreachIdAuditSummary_(audit) {
  return { headerPresent: audit.headerPresent, idColumn: audit.column + 1,
    populatedRows: audit.populatedRows.length, validIds: audit.validIdCount,
    rowsNeedingIds: audit.missingRows.length, missingRows: audit.missingRows,
    errors: audit.errors };
}
