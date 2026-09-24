/**
 * Shemotion private Google Apps Script bridge.
 *
 * Deploy this script as a web app that executes as the Shemotion account.
 * Cloudflare is the only intended caller. Requests must be JSON POSTs with a
 * top-level action and token. Contact fields may be supplied at the top level,
 * or inside a `payload` or `data` object.
 */

var CONTACT_ACTION_ = 'contact_submit';
var OUTREACH_ACTION_ = 'outreach_snapshot';
var CONTACT_RECIPIENT_ = 'shemotion.au@gmail.com';
var CONTACT_SUBJECT_PREFIX_ = 'New Shemotion enquiry - ';
var MAX_REQUEST_CHARS_ = 20000;
var MAX_TRACKER_ROWS_ = 5000;
var MAX_GMAIL_THREADS_ = 2000;
var GMAIL_PAGE_SIZE_ = 100;

var TRACKER_FIELDS_ = [
  { header: 'Priority', key: 'priority' },
  { header: 'Target', key: 'target' },
  { header: 'Category', key: 'category' },
  { header: 'Contact route', key: 'contactRoute' },
  { header: 'Website', key: 'website' },
  { header: 'Pitch angle', key: 'pitchAngle' },
  { header: 'Desired outcome', key: 'desiredOutcome' },
  { header: 'Status', key: 'status' },
  { header: 'Draft date', key: 'draftDate' },
  { header: 'Sent date', key: 'sentDate' },
  { header: 'Follow-up date', key: 'followUpDate' },
  { header: 'Response / outcome', key: 'responseOutcome' },
  { header: 'Coverage / backlink URL', key: 'coverageBacklinkUrl' },
  { header: 'Stream', key: 'stream' },
  { header: 'Outcome Type', key: 'outcomeType', optional: true },
  { header: 'Response Date', key: 'responseDate', optional: true },
  { header: 'Last Activity Date', key: 'lastActivityDate', optional: true }
];

function doPost(e) {
  try {
    var request = parseJsonRequest_(e);
    var security = getSecurityConfig_();
    var action = requireSingleLine_(request.action, 'action', 64);
    var suppliedToken = requireToken_(request.token);

    if (action === CONTACT_ACTION_) {
      authorize_(suppliedToken, security.contactToken);
      return jsonResponse_(handleContactSubmit_(request));
    }

    if (action === OUTREACH_ACTION_) {
      authorize_(suppliedToken, security.outreachToken);
      return jsonResponse_(handleOutreachSnapshot_());
    }

    throw publicError_('invalid_request');
  } catch (error) {
    return jsonResponse_({
      ok: false,
      error: safeErrorCode_(error)
    });
  }
}

function doGet() {
  return jsonResponse_({
    ok: false,
    error: 'method_not_allowed'
  });
}

function handleContactSubmit_(request) {
  var payload = payloadFromRequest_(request);
  var enquiry = validateContactPayload_(payload);
  var submittedAt = new Date();
  var submittedAtText = Utilities.formatDate(
    submittedAt,
    Session.getScriptTimeZone(),
    "yyyy-MM-dd HH:mm:ss z"
  );

  var subject = CONTACT_SUBJECT_PREFIX_ + enquiry.interestCategory + ' - ' + enquiry.name;
  var body = [
    'Name: ' + enquiry.name,
    'Email: ' + enquiry.email,
    'Phone: ' + (enquiry.phone || 'Not provided'),
    'Interest category: ' + enquiry.interestCategory,
    'Message:',
    enquiry.message,
    '',
    'Submission date/time: ' + submittedAtText,
    'Website source: ' + enquiry.websiteSource
  ].join('\n');

  GmailApp.sendEmail(CONTACT_RECIPIENT_, subject, body, {
    name: 'Shemotion Website',
    replyTo: enquiry.email
  });

  return {
    ok: true,
    action: CONTACT_ACTION_,
    receivedAt: submittedAt.toISOString()
  };
}

function handleOutreachSnapshot_() {
  var properties = PropertiesService.getScriptProperties();
  var spreadsheetId = requireScriptProperty_(properties, 'OUTREACH_SPREADSHEET_ID');
  var sheetName = requireScriptProperty_(properties, 'OUTREACH_SHEET_NAME');
  var trackerRows = readTrackerRows_(spreadsheetId, sheetName);
  var enquiries = readAggregateEnquiries_();

  return {
    ok: true,
    action: OUTREACH_ACTION_,
    generatedAt: new Date().toISOString(),
    tracker: {
      rowCount: trackerRows.length,
      rows: trackerRows
    },
    enquiries: {
      count: enquiries.length,
      threadCap: MAX_GMAIL_THREADS_,
      items: enquiries
    }
  };
}

function parseJsonRequest_(e) {
  if (!e || !e.postData || typeof e.postData.contents !== 'string') {
    throw publicError_('invalid_request');
  }

  var contentType = String(e.postData.type || '').toLowerCase();
  if (contentType.indexOf('application/json') !== 0) {
    throw publicError_('invalid_request');
  }

  if (!e.postData.contents || e.postData.contents.length > MAX_REQUEST_CHARS_) {
    throw publicError_('invalid_request');
  }

  var parsed;
  try {
    parsed = JSON.parse(e.postData.contents);
  } catch (error) {
    throw publicError_('invalid_request');
  }

  if (!isPlainObject_(parsed)) {
    throw publicError_('invalid_request');
  }

  return parsed;
}

function getSecurityConfig_() {
  var properties = PropertiesService.getScriptProperties();
  var contactToken = requireStrongSecret_(properties, 'CONTACT_WEBHOOK_TOKEN');
  var outreachToken = requireStrongSecret_(properties, 'OUTREACH_DASHBOARD_TOKEN');

  if (constantTimeEqual_(contactToken, outreachToken)) {
    throw publicError_('configuration_error');
  }

  return {
    contactToken: contactToken,
    outreachToken: outreachToken
  };
}

function requireStrongSecret_(properties, name) {
  var value = properties.getProperty(name);
  if (typeof value !== 'string' || value.length < 32) {
    throw publicError_('configuration_error');
  }
  return value;
}

function requireScriptProperty_(properties, name) {
  var value = properties.getProperty(name);
  if (typeof value !== 'string' || !value.trim()) {
    throw publicError_('configuration_error');
  }
  return value.trim();
}

function requireToken_(value) {
  if (typeof value !== 'string' || value.length < 32 || value.length > 1024) {
    throw publicError_('unauthorized');
  }
  return value;
}

function authorize_(supplied, expected) {
  if (!constantTimeEqual_(supplied, expected)) {
    throw publicError_('unauthorized');
  }
}

function constantTimeEqual_(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') {
    return false;
  }

  var length = Math.max(left.length, right.length);
  var mismatch = left.length ^ right.length;
  for (var index = 0; index < length; index += 1) {
    mismatch |= (left.charCodeAt(index % (left.length || 1)) || 0) ^
      (right.charCodeAt(index % (right.length || 1)) || 0);
  }
  return mismatch === 0;
}

function payloadFromRequest_(request) {
  if (isPlainObject_(request.payload)) {
    return request.payload;
  }
  if (isPlainObject_(request.data)) {
    return request.data;
  }
  return request;
}

function validateContactPayload_(payload) {
  var name = requireSingleLine_(firstDefined_(payload, ['name', 'fullName']), 'name', 120);
  var email = requireSingleLine_(firstDefined_(payload, ['email']), 'email', 254).toLowerCase();
  var phone = optionalSingleLine_(firstDefined_(payload, ['phone', 'phoneNumber']), 60);
  var interestCategory = requireSingleLine_(
    firstDefined_(payload, ['interestCategory', 'interest', 'category']),
    'interestCategory',
    120
  );
  var message = requireMessage_(firstDefined_(payload, ['message']), 5000);
  var websiteSource = optionalSingleLine_(
    firstDefined_(payload, ['websiteSource', 'source', 'pageUrl']),
    500
  ) || 'shemotion.com.au contact form';

  if (!isValidEmail_(email)) {
    throw publicError_('invalid_request');
  }

  if (phone && !/^[0-9+()\-.\s]{5,60}$/.test(phone)) {
    throw publicError_('invalid_request');
  }

  return {
    name: name,
    email: email,
    phone: phone,
    interestCategory: interestCategory,
    message: message,
    websiteSource: websiteSource
  };
}

function readTrackerRows_(spreadsheetId, sheetName) {
  var quotedSheetName = "'" + sheetName.replace(/'/g, "''") + "'";
  var range = quotedSheetName + '!A1:ZZ' + String(MAX_TRACKER_ROWS_ + 1);
  var endpoint = 'https://sheets.googleapis.com/v4/spreadsheets/' +
    encodeURIComponent(spreadsheetId) + '/values/' + encodeURIComponent(range) +
    '?majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING';

  var response;
  try {
    response = UrlFetchApp.fetch(endpoint, {
      method: 'get',
      headers: {
        Authorization: 'Bearer ' + ScriptApp.getOAuthToken()
      },
      muteHttpExceptions: true
    });
  } catch (error) {
    throw publicError_('upstream_error');
  }

  var status = response.getResponseCode();
  if (status < 200 || status >= 300) {
    throw publicError_('upstream_error');
  }

  var payload;
  try {
    payload = JSON.parse(response.getContentText());
  } catch (error) {
    throw publicError_('upstream_error');
  }

  var values = payload && Array.isArray(payload.values) ? payload.values : [];
  if (!values.length) {
    return [];
  }

  var headerIndexes = buildHeaderIndex_(values[0]);
  var rows = [];
  values.slice(1, MAX_TRACKER_ROWS_ + 1).forEach(function (sourceRow) {
    if (!Array.isArray(sourceRow)) {
      return;
    }

    var outputRow = {};
    var hasValue = false;
    TRACKER_FIELDS_.forEach(function (field) {
      var index = headerIndexes[normalizeHeader_(field.header)];
      var value = index === undefined ? '' : sanitizeTrackerValue_(sourceRow[index]);
      outputRow[field.key] = value;
      hasValue = hasValue || Boolean(value);
    });

    if (!outputRow.stream) {
      outputRow.stream = classifyStream_(outputRow);
    }

    if (hasValue) {
      rows.push(outputRow);
    }
  });

  return rows;
}

function buildHeaderIndex_(headerRow) {
  var indexes = {};
  headerRow.forEach(function (header, index) {
    var normalized = normalizeHeader_(header);
    if (normalized && indexes[normalized] === undefined) {
      indexes[normalized] = index;
    }
  });
  return indexes;
}

function normalizeHeader_(value) {
  return String(value == null ? '' : value)
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function sanitizeTrackerValue_(value) {
  var text = String(value == null ? '' : value)
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.slice(0, 2000);
}

function classifyStream_(row) {
  var text = [
    row.target,
    row.category,
    row.contactRoute,
    row.pitchAngle,
    row.desiredOutcome,
    row.responseOutcome
  ].join(' ').toLowerCase();

  var rules = [
    {
      label: 'Media / PR',
      pattern: /\b(media|press|journalist|editorial|publication|magazine|newspaper|radio|television|podcast|coverage|backlink)\b/
    },
    {
      label: 'Directories / listings',
      pattern: /\b(directory|directories|listing|listings|calendar|what(?:'s| is) on|event guide)\b/
    },
    {
      label: 'Partnerships',
      pattern: /\b(partner|partnership|collab|collaboration|sponsor|sponsorship|venue|studio|retreat|hotel|brand)\b/
    },
    {
      label: 'Community / groups',
      pattern: /\b(community|group|club|meetup|network|association|wellness|women|mums|mothers)\b/
    }
  ];

  for (var index = 0; index < rules.length; index += 1) {
    if (rules[index].pattern.test(text)) {
      return rules[index].label;
    }
  }
  return 'Other / unmapped';
}

function readAggregateEnquiries_() {
  var query = 'subject:"' + CONTACT_SUBJECT_PREFIX_.trim() + '"';
  var threads = [];
  var start = 0;

  while (threads.length < MAX_GMAIL_THREADS_) {
    var pageSize = Math.min(GMAIL_PAGE_SIZE_, MAX_GMAIL_THREADS_ - threads.length);
    var page;
    try {
      page = GmailApp.search(query, start, pageSize);
    } catch (error) {
      throw publicError_('upstream_error');
    }

    if (!page.length) {
      break;
    }
    Array.prototype.push.apply(threads, page);
    start += page.length;
    if (page.length < pageSize) {
      break;
    }
  }

  var enquiries = [];
  for (var batchStart = 0; batchStart < threads.length; batchStart += GMAIL_PAGE_SIZE_) {
    var messageGroups;
    try {
      messageGroups = GmailApp.getMessagesForThreads(
        threads.slice(batchStart, batchStart + GMAIL_PAGE_SIZE_)
      );
    } catch (error) {
      throw publicError_('upstream_error');
    }

    messageGroups.forEach(function (messages) {
      for (var index = 0; index < messages.length; index += 1) {
        var subject = messages[index].getSubject();
        var match = /^New Shemotion enquiry\s+-\s+(.+?)\s+-\s+.+$/i.exec(subject);
        if (!match) {
          continue;
        }

        var category = optionalSingleLine_(match[1], 120);
        if (category) {
          enquiries.push({
            timestamp: messages[index].getDate().toISOString(),
            category: category
          });
        }
        break;
      }
    });
  }

  enquiries.sort(function (left, right) {
    return right.timestamp.localeCompare(left.timestamp);
  });
  return enquiries;
}

function firstDefined_(object, keys) {
  for (var index = 0; index < keys.length; index += 1) {
    if (object[keys[index]] !== undefined && object[keys[index]] !== null) {
      return object[keys[index]];
    }
  }
  return undefined;
}

function requireSingleLine_(value, fieldName, maximumLength) {
  var text = optionalSingleLine_(value, maximumLength);
  if (!text) {
    throw publicError_('invalid_request');
  }
  return text;
}

function optionalSingleLine_(value, maximumLength) {
  if (value === undefined || value === null || value === '') {
    return '';
  }
  if (typeof value !== 'string') {
    throw publicError_('invalid_request');
  }

  var text = value
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text || text.length > maximumLength) {
    throw publicError_('invalid_request');
  }
  return text;
}

function requireMessage_(value, maximumLength) {
  if (typeof value !== 'string') {
    throw publicError_('invalid_request');
  }

  var text = value
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .trim();
  if (!text || text.length > maximumLength) {
    throw publicError_('invalid_request');
  }
  return text;
}

function isValidEmail_(value) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isPlainObject_(value) {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function publicError_(code) {
  var error = new Error(code);
  error.publicCode = code;
  return error;
}

function safeErrorCode_(error) {
  var allowed = {
    invalid_request: true,
    unauthorized: true,
    configuration_error: true,
    upstream_error: true,
    method_not_allowed: true
  };
  return error && allowed[error.publicCode] ? error.publicCode : 'internal_error';
}

function jsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
