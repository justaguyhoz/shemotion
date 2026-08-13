import { RECURRENCE_OPTIONS } from "../recurrence.js";

export const AVAILABILITY_OPTIONS = [
  "Available",
  "Limited spaces",
  "Sold out",
  "Cancelled",
];

export const EVENT_TYPES = ["Class", "Workshop", "Retreat", "Private event"];
export const DATE_STATUS_OPTIONS = ["scheduled", "tbc"];

export const EVENT_FIELDS = [
  "title",
  "eventType",
  "venueName",
  "suburb",
  "address",
  "dateStatus",
  "startAt",
  "endAt",
  "timezone",
  "audience",
  "shortDescription",
  "bookingLabel",
  "bookingUrl",
  "availabilityStatus",
  "isPublished",
  "displayOrder",
  "recurrenceFrequency",
  "recurrenceUntil",
  "locationId",
];

const LIMITS = {
  title: 120,
  eventType: 40,
  venueName: 120,
  suburb: 80,
  address: 200,
  dateStatus: 20,
  timezone: 80,
  audience: 80,
  shortDescription: 600,
  bookingLabel: 60,
  bookingUrl: 500,
  recurrenceFrequency: 20,
};

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function validIsoDate(value) {
  return typeof value === "string" && value.length > 0 && Number.isFinite(Date.parse(value));
}

function brisbaneDate(value) {
  if (!validIsoDate(value)) return null;
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Australia/Brisbane",
  }).format(new Date(value));
}

export function validateEventInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { errors: ["A valid event object is required."] };
  }

  const event = {};
  for (const field of EVENT_FIELDS) {
    if (Object.hasOwn(input, field)) event[field] = input[field];
  }

  const required = [
    "title",
    "eventType",
    "venueName",
    "dateStatus",
    "audience",
    "bookingLabel",
    "availabilityStatus",
  ];
  const errors = [];

  for (const field of Object.keys(LIMITS)) {
    if (field === "bookingUrl") continue;
    if (Object.hasOwn(event, field)) event[field] = cleanText(event[field]);
    if (event[field]?.length > LIMITS[field]) errors.push(`${field} is too long.`);
  }

  for (const field of required) {
    if (!cleanText(event[field])) errors.push(`${field} is required.`);
  }

  event.suburb = cleanText(event.suburb) || null;
  event.address = cleanText(event.address) || null;
  event.shortDescription = cleanText(event.shortDescription);
  event.dateStatus = cleanText(event.dateStatus) || "scheduled";
  event.startAt = cleanText(event.startAt) || null;
  event.endAt = cleanText(event.endAt) || null;
  event.timezone = cleanText(event.timezone) || "Australia/Brisbane";
  event.bookingUrl = cleanText(event.bookingUrl) || null;
  event.isPublished = event.isPublished === true || event.isPublished === 1;
  event.displayOrder = Number.isInteger(Number(event.displayOrder)) ? Number(event.displayOrder) : 0;
  event.recurrenceFrequency = cleanText(event.recurrenceFrequency) || "none";
  event.recurrenceUntil = cleanText(event.recurrenceUntil) || null;
  event.locationId = Number.isSafeInteger(Number(event.locationId)) && Number(event.locationId) > 0
    ? Number(event.locationId)
    : null;

  if (!EVENT_TYPES.includes(event.eventType)) errors.push("eventType is invalid.");
  if (!DATE_STATUS_OPTIONS.includes(event.dateStatus)) errors.push("dateStatus is invalid.");
  if (!AVAILABILITY_OPTIONS.includes(event.availabilityStatus)) errors.push("availabilityStatus is invalid.");
  if (!RECURRENCE_OPTIONS.includes(event.recurrenceFrequency)) errors.push("recurrenceFrequency is invalid.");
  if (event.recurrenceFrequency !== "none" && event.dateStatus === "tbc") errors.push("Recurring events require a scheduled date.");
  if (event.recurrenceUntil && !/^\d{4}-\d{2}-\d{2}$/.test(event.recurrenceUntil)) errors.push("recurrenceUntil must be a valid date.");
  if (event.recurrenceUntil && event.startAt && event.recurrenceUntil < brisbaneDate(event.startAt)) {
    errors.push("recurrenceUntil must be on or after the first event date.");
  }
  if (event.dateStatus === "scheduled" && !validIsoDate(event.startAt)) errors.push("startAt must be a valid date and time.");
  if (event.dateStatus === "tbc") {
    event.startAt = null;
    event.endAt = null;
  }
  if (event.endAt && !validIsoDate(event.endAt)) errors.push("endAt must be a valid date and time.");
  if (validIsoDate(event.startAt) && event.endAt && validIsoDate(event.endAt) && Date.parse(event.endAt) <= Date.parse(event.startAt)) {
    errors.push("endAt must be later than startAt.");
  }
  if (event.bookingUrl) {
    try {
      const url = new URL(event.bookingUrl);
      if (url.protocol !== "https:") errors.push("bookingUrl must use https.");
    } catch {
      errors.push("bookingUrl must be a valid https URL.");
    }
    if (event.bookingUrl.length > LIMITS.bookingUrl) errors.push("bookingUrl is too long.");
  }
  if (event.displayOrder < -1000 || event.displayOrder > 1000) errors.push("displayOrder must be between -1000 and 1000.");

  return errors.length ? { errors } : { event };
}

export function rowToPublicEvent(row) {
  return {
    id: row.id,
    title: row.title,
    eventType: row.event_type,
    venueName: row.venue_name,
    suburb: row.suburb,
    address: row.address,
    dateStatus: row.date_status,
    startAt: row.start_at,
    endAt: row.end_at,
    timezone: row.timezone,
    audience: row.audience,
    shortDescription: row.short_description,
    bookingLabel: row.booking_label,
    bookingUrl: row.booking_url,
    availabilityStatus: row.availability_status,
    recurrenceFrequency: row.recurrence_frequency || "none",
    recurrenceUntil: row.recurrence_until,
    displayOrder: row.display_order || 0,
    locationId: row.location_id || null,
    latitude: row.latitude != null && Number.isFinite(Number(row.latitude)) ? Number(row.latitude) : null,
    longitude: row.longitude != null && Number.isFinite(Number(row.longitude)) ? Number(row.longitude) : null,
    googleMapsUrl: row.google_maps_url || null,
  };
}

export function rowToAdminEvent(row) {
  return {
    ...rowToPublicEvent(row),
    isPublished: row.is_published === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function eventValues(event) {
  return [
    event.title,
    event.eventType,
    event.venueName,
    event.suburb,
    event.address,
    event.dateStatus,
    event.startAt ? new Date(event.startAt).toISOString() : null,
    event.endAt ? new Date(event.endAt).toISOString() : null,
    event.timezone,
    event.audience,
    event.shortDescription,
    event.bookingLabel,
    event.bookingUrl,
    event.availabilityStatus,
    event.isPublished ? 1 : 0,
    event.displayOrder,
    event.recurrenceFrequency,
    event.recurrenceUntil,
    event.locationId,
  ];
}

export function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
  });
}
