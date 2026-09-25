const INTEREST_CATEGORIES = new Set([
  "Upcoming event or booking",
  "Private group or retreat",
  "Workplace or organisation",
  "Event, conference or venue",
  "Media or interview",
  "Venue or studio partnership",
  "Something else",
]);

export const MARKETING_CONSENT_TEXT = "Yes, I'd like to hear about upcoming Shemotion events and experiences.";
export const MARKETING_CONSENT_VERSION = "2026-09-25";

const UTM_FIELDS = ["utmSource", "utmMedium", "utmCampaign", "utmContent", "utmTerm"];

function singleLine(value, maximumLength, required = true) {
  if (typeof value !== "string") {
    if (!required && (value === undefined || value === null)) return "";
    throw new Error("Invalid contact field");
  }
  const result = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  if ((required && !result) || result.length > maximumLength) throw new Error("Invalid contact field");
  return result;
}

function messageText(value) {
  if (typeof value !== "string") throw new Error("Invalid contact field");
  const result = value
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim();
  if (!result || result.length > 5000) throw new Error("Invalid contact field");
  return result;
}

function optionalConsent(value) {
  if (value === undefined || value === null || value === "" || value === false) return false;
  if (value === true || value === "yes") return true;
  throw new Error("Invalid contact field");
}

function optionalSourcePath(value) {
  const path = singleLine(value ?? "", 500, false);
  if (!path) return "";
  if (!path.startsWith("/") || path.startsWith("//") || /[?#]/.test(path)) throw new Error("Invalid contact field");
  return path;
}

function optionalReferrerUrl(value) {
  const text = singleLine(value ?? "", 500, false);
  if (!text) return "";
  let url;
  try { url = new URL(text); } catch { throw new Error("Invalid contact field"); }
  if (!new Set(["http:", "https:"]).has(url.protocol)) throw new Error("Invalid contact field");
  url.search = "";
  url.hash = "";
  return url.toString().slice(0, 500);
}

function optionalSubmissionId(value) {
  const result = singleLine(value ?? "", 64, false);
  if (!result) return "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result)) {
    throw new Error("Invalid contact field");
  }
  return result.toLowerCase();
}

export function validateContactInput(input) {
  if (!input || Object.prototype.toString.call(input) !== "[object Object]") {
    throw new Error("Invalid contact request");
  }

  const name = singleLine(input.name, 120);
  const email = singleLine(input.email, 254).toLowerCase();
  const phone = singleLine(input.phone ?? "", 60, false);
  const interestCategory = singleLine(input.interestCategory, 120);
  const message = messageText(input.message);
  const marketingConsent = optionalConsent(input.marketingConsent);
  const submissionId = optionalSubmissionId(input.submissionId);
  const sourcePath = optionalSourcePath(input.sourcePath);
  const referrerUrl = optionalReferrerUrl(input.referrerUrl);
  const attribution = Object.fromEntries(UTM_FIELDS.map((field) => [field, singleLine(input[field] ?? "", 200, false)]));

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Invalid contact field");
  if (phone && !/^[0-9+()\-.\s]{5,60}$/.test(phone)) throw new Error("Invalid contact field");
  if (!INTEREST_CATEGORIES.has(interestCategory)) throw new Error("Invalid contact field");

  return { name, email, phone, interestCategory, message, marketingConsent, submissionId, sourcePath, referrerUrl, ...attribution };
}
