import { MARKETING_CONSENT_TEXT, MARKETING_CONSENT_VERSION } from "./contact.js";

export const CONTACT_TYPES = ["consumer", "organisation", "media", "hr_people_culture", "event_organiser", "other"];
export const CONTACT_STATUSES = ["active", "archived"];
export const ENQUIRY_STATUSES = ["new", "reviewed", "replied", "closed"];
export const MARKETING_STATUSES = ["not_given", "subscribed", "unsubscribed"];

export function splitContactName(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { firstName: parts[0] || "", lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export function contactTypeForEnquiry(enquiryType) {
  const types = {
    "Upcoming event or booking": "consumer",
    "Private group or retreat": "event_organiser",
    "Workplace or organisation": "hr_people_culture",
    "Event, conference or venue": "event_organiser",
    "Media or interview": "media",
    "Venue or studio partnership": "organisation",
    "Something else": "other",
  };
  return types[enquiryType] || "other";
}

export function attributionForRequest(request, payload) {
  const requestUrl = new URL(request.url);
  const fallbackPath = (() => {
    const referrer = request.headers.get("referer");
    if (!referrer) return "/";
    try {
      const url = new URL(referrer);
      return url.origin === requestUrl.origin ? url.pathname : "/";
    } catch {
      return "/";
    }
  })();
  const sourcePath = payload.sourcePath || fallbackPath;
  return {
    source: "website_contact_form",
    sourceUrl: `${requestUrl.origin}${sourcePath}`.slice(0, 500),
    utmSource: payload.utmSource,
    utmMedium: payload.utmMedium,
    utmCampaign: payload.utmCampaign,
    utmContent: payload.utmContent,
    utmTerm: payload.utmTerm,
  };
}

export async function storeContactSubmission(db, payload, attribution, submittedAt = new Date().toISOString()) {
  if (!db?.prepare || !db?.batch) throw new Error("Contact database is unavailable");
  const submissionId = payload.submissionId || crypto.randomUUID();
  const { firstName, lastName } = splitContactName(payload.name);
  const contactType = contactTypeForEnquiry(payload.interestCategory);
  const contactValues = [
    firstName, lastName, payload.email, payload.email, payload.phone, contactType,
    attribution.source, attribution.sourceUrl, attribution.utmSource, attribution.utmMedium,
    attribution.utmCampaign, attribution.utmContent, attribution.utmTerm, submittedAt, submittedAt,
  ];
  const enquiryValues = [
    submissionId, payload.email, payload.interestCategory, payload.message, attribution.source,
    attribution.sourceUrl, attribution.utmSource, attribution.utmMedium, attribution.utmCampaign,
    attribution.utmContent, attribution.utmTerm, submittedAt,
  ];

  const statements = [
    db.prepare(`
      INSERT INTO contacts (
        first_name, last_name, email, email_normalized, phone, contact_type,
        first_source, first_source_url, first_utm_source, first_utm_medium,
        first_utm_campaign, first_utm_content, first_utm_term,
        first_contact_at, last_activity_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(email_normalized) DO UPDATE SET
        first_name = CASE WHEN excluded.first_name != '' THEN excluded.first_name ELSE contacts.first_name END,
        last_name = CASE WHEN excluded.last_name != '' THEN excluded.last_name ELSE contacts.last_name END,
        email = excluded.email,
        phone = CASE WHEN excluded.phone != '' THEN excluded.phone ELSE contacts.phone END,
        contact_type = CASE
          WHEN contacts.contact_type = 'other' THEN excluded.contact_type
          WHEN contacts.contact_type = 'consumer' AND excluded.contact_type NOT IN ('consumer', 'other') THEN excluded.contact_type
          ELSE contacts.contact_type
        END,
        last_activity_at = excluded.last_activity_at,
        updated_at = CURRENT_TIMESTAMP
    `).bind(...contactValues),
    db.prepare(`
      INSERT INTO enquiries (
        submission_id, contact_id, enquiry_type, message, source, source_url,
        utm_source, utm_medium, utm_campaign, utm_content, utm_term, submitted_at
      )
      SELECT ?, id, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      FROM contacts WHERE email_normalized = ?
      ON CONFLICT(submission_id) DO NOTHING
    `).bind(
      enquiryValues[0], enquiryValues[2], enquiryValues[3], enquiryValues[4], enquiryValues[5],
      enquiryValues[6], enquiryValues[7], enquiryValues[8], enquiryValues[9], enquiryValues[10],
      enquiryValues[11], enquiryValues[1]
    ),
  ];

  if (payload.marketingConsent) {
    statements.push(db.prepare(`
      INSERT INTO contact_consents (
        submission_id, contact_id, consent_type, status, source,
        consent_text, consent_version, recorded_at
      )
      SELECT ?, id, 'marketing_email', 'granted', ?, ?, ?, ?
      FROM contacts WHERE email_normalized = ?
      ON CONFLICT(submission_id) DO NOTHING
    `).bind(
      submissionId, attribution.source, MARKETING_CONSENT_TEXT,
      MARKETING_CONSENT_VERSION, submittedAt, payload.email
    ));
  }

  await db.batch(statements);
  const enquiry = await db.prepare(`
    SELECT id, contact_id, submission_id, notification_status
    FROM enquiries WHERE submission_id = ?
  `).bind(submissionId).first();
  if (!enquiry) throw new Error("Contact submission was not stored");
  return { ...enquiry, submissionId };
}

export async function claimContactNotification(db, submissionId, attemptedAt = new Date().toISOString()) {
  const claimed = await db.prepare(`
    UPDATE enquiries
    SET notification_status = 'sending', notification_attempted_at = ?, updated_at = CURRENT_TIMESTAMP
    WHERE submission_id = ? AND notification_status IN ('pending', 'failed')
    RETURNING id
  `).bind(attemptedAt, submissionId).first();
  if (claimed) return "send";
  const current = await db.prepare(`SELECT notification_status FROM enquiries WHERE submission_id = ?`).bind(submissionId).first();
  if (current?.notification_status === "sent") return "sent";
  return "processing";
}

export async function markContactNotification(db, submissionId, status, recordedAt = new Date().toISOString()) {
  if (!new Set(["sent", "failed"]).has(status)) throw new Error("Invalid notification status");
  await db.prepare(`
    UPDATE enquiries
    SET notification_status = ?,
        notification_sent_at = CASE WHEN ? = 'sent' THEN ? ELSE notification_sent_at END,
        updated_at = CURRENT_TIMESTAMP
    WHERE submission_id = ?
  `).bind(status, status, recordedAt, submissionId).run();
}

function requiredChoice(value, choices) {
  const text = String(value || "").trim();
  if (!choices.includes(text)) throw new Error("Invalid value");
  return text;
}

function adminText(value, maximumLength, required = false) {
  if (typeof value !== "string") throw new Error("Invalid value");
  const text = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  if ((required && !text) || text.length > maximumLength) throw new Error("Invalid value");
  return text;
}

export function validateContactAdminInput(input) {
  if (!input || Object.prototype.toString.call(input) !== "[object Object]") throw new Error("Invalid contact update");
  const firstName = adminText(input.firstName ?? "", 120);
  const lastName = adminText(input.lastName ?? "", 120);
  const phone = adminText(input.phone ?? "", 60);
  if (!firstName && !lastName) throw new Error("A contact name is required");
  if (phone && !/^[0-9+()\-.\s]{5,60}$/.test(phone)) throw new Error("Invalid phone");
  return {
    firstName,
    lastName,
    phone,
    contactType: requiredChoice(input.contactType, CONTACT_TYPES),
    status: requiredChoice(input.status, CONTACT_STATUSES),
  };
}

export function validateEnquiryAdminInput(input) {
  if (!input || Object.prototype.toString.call(input) !== "[object Object]") throw new Error("Invalid enquiry update");
  return {
    status: requiredChoice(input.status, ENQUIRY_STATUSES),
    adminNotes: adminText(input.adminNotes ?? "", 5000),
  };
}

export function positiveInteger(value) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) throw new Error("Invalid identifier");
  return number;
}
