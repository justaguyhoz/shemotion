const STORAGE_KEY = "shemotion:first-touch";
const PARAMETERS = {
  utm_source: "utmSource",
  utm_medium: "utmMedium",
  utm_campaign: "utmCampaign",
  utm_content: "utmContent",
  utm_term: "utmTerm",
};

function cleanValue(value) {
  return String(value || "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
}

export function captureContactAttribution(location = globalThis.location, storage = globalThis.sessionStorage) {
  const fallback = { sourcePath: location?.pathname || "/", utmSource: "", utmMedium: "", utmCampaign: "", utmContent: "", utmTerm: "" };
  if (!storage) return fallback;
  try {
    const existing = JSON.parse(storage.getItem(STORAGE_KEY) || "null");
    if (existing?.sourcePath?.startsWith("/")) return { ...fallback, ...existing };
  } catch {
    // Replace malformed session attribution with a clean first-touch record.
  }

  const search = new URLSearchParams(location?.search || "");
  const attribution = { ...fallback };
  for (const [parameter, field] of Object.entries(PARAMETERS)) attribution[field] = cleanValue(search.get(parameter));
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(attribution));
  } catch {
    // Attribution is optional when session storage is unavailable.
  }
  return attribution;
}
