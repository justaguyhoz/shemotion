import { MARKETING_CONSENT_TEXT, MARKETING_CONSENT_VERSION } from "./contact.js";

export const CONTACT_TYPES = ["consumer", "organisation", "media", "hr_people_culture", "event_organiser", "other"];
export const CONTACT_STATUSES = ["active", "archived"];
export const ENQUIRY_STATUSES = ["new", "reviewed", "replied", "closed"];
export const MARKETING_STATUSES = ["not_given", "subscribed", "unsubscribed"];
export const SOURCE_PLATFORMS = [
  "google_ads", "google_organic", "facebook_ads", "facebook_organic",
  "instagram_ads", "instagram_organic", "outreach", "referral", "event",
  "direct", "email", "other", "unknown",
];

export const SOURCE_PLATFORM_LABELS = {
  google_ads: "Google Ads", google_organic: "Google Organic",
  facebook_ads: "Facebook Ads", facebook_organic: "Facebook Organic",
  instagram_ads: "Instagram Ads", instagram_organic: "Instagram Organic",
  outreach: "Outreach", referral: "Referral", event: "Event", direct: "Direct",
  email: "Email", other: "Other", unknown: "Unknown",
};

function signal(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

function referrerHost(value) {
  try { return new URL(value).hostname.toLowerCase().replace(/^www\./, ""); }
  catch { return ""; }
}

export function sourcePlatformForAttribution(attribution = {}) {
  const source = signal(attribution.utmSource);
  const medium = signal(attribution.utmMedium);
  const campaign = signal(attribution.utmCampaign);
  const host = referrerHost(attribution.referrerUrl);
  const paid = /(^|_)(cpc|ppc|paid|paid_search|paid_social|display|ads?)(_|$)/.test(`${medium}_${campaign}`);
  const organic = /(^|_)(organic|social|search)(_|$)/.test(medium);
  const google = source === "google" || source === "googleads" || /(^|\.)google\.[a-z.]+$/.test(host);
  const facebook = new Set(["facebook", "fb", "meta"]).has(source) || host === "facebook.com" || host.endsWith(".facebook.com");
  const instagram = new Set(["instagram", "ig"]).has(source) || host === "instagram.com" || host.endsWith(".instagram.com");

  if (medium === "email" || source === "email") return "email";
  if (source === "outreach") return "outreach";
  if (source === "event") return "event";
  if (source === "referral") return "referral";
  if (source === "direct") return "direct";
  if (google) {
    if (paid) return "google_ads";
    if (organic || host) return "google_organic";
    return "unknown";
  }
  if (facebook) {
    if (paid) return "facebook_ads";
    if (organic || host) return "facebook_organic";
    return "unknown";
  }
  if (instagram) {
    if (paid) return "instagram_ads";
    if (organic || host) return "instagram_organic";
    return "unknown";
  }
  if (!source && !medium && !campaign && !host) return "direct";
  if (host) return "referral";
  if (source === "other") return "other";
  return "unknown";
}

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
  const attribution = {
    source: "website_contact_form",
    sourceUrl: `${requestUrl.origin}${sourcePath}`.slice(0, 500),
    referrerUrl: payload.referrerUrl,
    utmSource: payload.utmSource,
    utmMedium: payload.utmMedium,
    utmCampaign: payload.utmCampaign,
    utmContent: payload.utmContent,
    utmTerm: payload.utmTerm,
  };
  return { ...attribution, sourcePlatform: sourcePlatformForAttribution(attribution) };
}

export async function storeContactSubmission(db, payload, attribution, submittedAt = new Date().toISOString()) {
  if (!db?.prepare || !db?.batch) throw new Error("Contact database is unavailable");
  const submissionId = payload.submissionId || crypto.randomUUID();
  const { firstName, lastName } = splitContactName(payload.name);
  const contactType = contactTypeForEnquiry(payload.interestCategory);
  const contactValues = [
    firstName, lastName, payload.email, payload.email, payload.phone, contactType,
    attribution.source, attribution.sourceUrl, attribution.sourcePlatform, attribution.referrerUrl,
    attribution.utmSource, attribution.utmMedium,
    attribution.utmCampaign, attribution.utmContent, attribution.utmTerm, submittedAt, submittedAt,
  ];
  const enquiryValues = [
    submissionId, payload.email, payload.interestCategory, payload.message, attribution.source,
    attribution.sourceUrl, attribution.sourcePlatform, attribution.referrerUrl,
    attribution.utmSource, attribution.utmMedium, attribution.utmCampaign,
    attribution.utmContent, attribution.utmTerm, submittedAt,
  ];

  const statements = [
    db.prepare(`
      INSERT INTO contacts (
        first_name, last_name, email, email_normalized, phone, contact_type,
        first_source, first_source_url, first_source_platform, first_referrer_url,
        first_utm_source, first_utm_medium,
        first_utm_campaign, first_utm_content, first_utm_term,
        first_contact_at, last_activity_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        source_platform, referrer_url,
        utm_source, utm_medium, utm_campaign, utm_content, utm_term, submitted_at
      )
      SELECT ?, id, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      FROM contacts WHERE email_normalized = ?
      ON CONFLICT(submission_id) DO NOTHING
    `).bind(
      enquiryValues[0], enquiryValues[2], enquiryValues[3], enquiryValues[4], enquiryValues[5],
      enquiryValues[6], enquiryValues[7], enquiryValues[8], enquiryValues[9], enquiryValues[10],
      enquiryValues[11], enquiryValues[12], enquiryValues[13], enquiryValues[1]
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
    WHERE submission_id = ? AND notification_required = 1 AND notification_status IN ('pending', 'failed')
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

function adminMultiline(value, maximumLength, required = false) {
  if (typeof value !== "string") throw new Error("Invalid value");
  const text = value.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ").trim();
  if ((required && !text) || text.length > maximumLength) throw new Error("Invalid value");
  return text;
}

function adminEmail(value) {
  const email = adminText(value, 254, true).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Invalid email");
  return email;
}

function adminTimestamp(value, fallback, now) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string" || !/(Z|[+-]\d{2}:\d{2})$/.test(value)) throw new Error("Invalid date");
  const date = new Date(value);
  if (Number.isNaN(date.valueOf()) || date.getUTCFullYear() < 1990 || date.valueOf() > now.valueOf() + 300000) {
    throw new Error("Invalid date");
  }
  return date.toISOString();
}

export function validateManualContactInput(input, now = new Date()) {
  if (!input || Object.prototype.toString.call(input) !== "[object Object]") throw new Error("Invalid contact creation");
  const nowIso = now.toISOString();
  const firstName = adminText(input.firstName ?? "", 120, true);
  const lastName = adminText(input.lastName ?? "", 120, true);
  const email = adminEmail(input.email);
  const phone = adminText(input.phone ?? "", 60);
  if (phone && !/^[0-9+()\-.\s]{5,60}$/.test(phone)) throw new Error("Invalid phone");
  const sourcePlatform = requiredChoice(input.sourcePlatform || "unknown", SOURCE_PLATFORMS);
  const source = adminText(input.source ?? "", 200) || "manual_admin_entry";
  const suppliedContactAt = adminTimestamp(input.originalContactAt, nowIso, now);
  const includeEnquiry = input.includeEnquiry === true || input.includeEnquiry === "yes";
  const adminNotes = adminMultiline(input.adminNotes ?? "", 5000);
  let enquiry = null;
  let firstContactAt = suppliedContactAt;
  let lastActivityAt = suppliedContactAt;

  if (includeEnquiry) {
    const submittedAt = adminTimestamp(input.enquiryAt, suppliedContactAt, now);
    enquiry = {
      enquiryType: adminText(input.enquiryType ?? "", 120, true),
      message: adminMultiline(input.message ?? "", 5000, true),
      submittedAt,
      source: adminText(input.enquirySource ?? "", 200) || source,
      sourcePlatform,
      adminNotes: adminMultiline(input.enquiryAdminNotes ?? "", 5000),
    };
    firstContactAt = new Date(submittedAt) < new Date(suppliedContactAt) ? submittedAt : suppliedContactAt;
    lastActivityAt = new Date(submittedAt) > new Date(suppliedContactAt) ? submittedAt : suppliedContactAt;
  }

  return {
    firstName, lastName, email, phone,
    contactType: requiredChoice(input.contactType, CONTACT_TYPES),
    sourcePlatform, source, adminNotes, firstContactAt, lastActivityAt, enquiry,
  };
}

export class ManualContactExistsError extends Error {
  constructor(contactId) {
    super("Contact already exists");
    this.name = "ManualContactExistsError";
    this.contactId = contactId;
  }
}

export async function createManualContact(db, input, uuidFactory = () => crypto.randomUUID()) {
  if (!db?.prepare || !db?.batch) throw new Error("Contact database is unavailable");
  const existing = await db.prepare("SELECT id FROM contacts WHERE email_normalized = ?").bind(input.email).first();
  if (existing) throw new ManualContactExistsError(existing.id);

  const statements = [db.prepare(`
    INSERT INTO contacts (
      first_name, last_name, email, email_normalized, phone, contact_type, status,
      first_source, first_source_url, first_source_platform, first_referrer_url,
      first_utm_source, first_utm_medium, first_utm_campaign, first_utm_content, first_utm_term,
      first_contact_at, last_activity_at, admin_notes
    ) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, '', ?, '', '', '', '', '', '', ?, ?, ?)
  `).bind(
    input.firstName, input.lastName, input.email, input.email, input.phone, input.contactType,
    input.source, input.sourcePlatform, input.firstContactAt, input.lastActivityAt, input.adminNotes
  )];

  if (input.enquiry) {
    statements.push(db.prepare(`
      INSERT INTO enquiries (
        submission_id, contact_id, enquiry_type, message, source, source_url,
        source_platform, referrer_url, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
        submitted_at, status, admin_notes, notification_required
      )
      SELECT ?, id, ?, ?, ?, '', ?, '', '', '', '', '', '', ?, 'new', ?, 0
      FROM contacts WHERE email_normalized = ?
    `).bind(
      `manual:${uuidFactory()}`, input.enquiry.enquiryType, input.enquiry.message,
      input.enquiry.source, input.enquiry.sourcePlatform, input.enquiry.submittedAt,
      input.enquiry.adminNotes, input.email
    ));
  }

  try {
    await db.batch(statements);
  } catch (error) {
    const duplicate = await db.prepare("SELECT id FROM contacts WHERE email_normalized = ?").bind(input.email).first();
    if (duplicate) throw new ManualContactExistsError(duplicate.id);
    throw error;
  }
  const contact = await db.prepare("SELECT id FROM contacts WHERE email_normalized = ?").bind(input.email).first();
  if (!contact) throw new Error("Manual contact was not stored");
  return { contactId: contact.id };
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
    adminNotes: adminMultiline(input.adminNotes ?? "", 5000),
  };
}

export function validateEnquiryAdminInput(input) {
  if (!input || Object.prototype.toString.call(input) !== "[object Object]") throw new Error("Invalid enquiry update");
  return {
    status: requiredChoice(input.status, ENQUIRY_STATUSES),
    adminNotes: adminMultiline(input.adminNotes ?? "", 5000),
  };
}

export function positiveInteger(value) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) throw new Error("Invalid identifier");
  return number;
}
