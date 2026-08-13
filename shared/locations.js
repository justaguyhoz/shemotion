const LIMITS = {
  name: 120,
  suburb: 80,
  address: 200,
  googleMapsUrl: 1000,
};

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function validateLocationInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { errors: ["A valid location object is required."] };
  }

  const location = {
    name: cleanText(input.name),
    suburb: cleanText(input.suburb) || null,
    address: cleanText(input.address),
    latitude: input.latitude === "" || input.latitude == null ? null : Number(input.latitude),
    longitude: input.longitude === "" || input.longitude == null ? null : Number(input.longitude),
    googleMapsUrl: cleanText(input.googleMapsUrl) || null,
  };
  const errors = [];
  if (!location.name) errors.push("Location name is required.");
  if (!location.address) errors.push("Location address is required.");
  if (/^https?:\/\//i.test(location.address)) errors.push("Address must be a street address, not a web link.");
  for (const [field, limit] of Object.entries(LIMITS)) {
    if (location[field]?.length > limit) errors.push(`${field} is too long.`);
  }
  const hasLatitude = location.latitude !== null;
  const hasLongitude = location.longitude !== null;
  if (hasLatitude !== hasLongitude) errors.push("Latitude and longitude must be provided together.");
  if (hasLatitude && (!Number.isFinite(location.latitude) || location.latitude < -90 || location.latitude > 90)) {
    errors.push("Latitude must be between -90 and 90.");
  }
  if (hasLongitude && (!Number.isFinite(location.longitude) || location.longitude < -180 || location.longitude > 180)) {
    errors.push("Longitude must be between -180 and 180.");
  }
  if (location.googleMapsUrl) {
    try {
      const url = new URL(location.googleMapsUrl);
      if (url.protocol !== "https:" || !/(^|\.)google\.[a-z.]+$|(^|\.)maps\.app\.goo\.gl$|^goo\.gl$/i.test(url.hostname)) {
        errors.push("Google Maps URL must be an https Google Maps link.");
      }
    } catch {
      errors.push("Google Maps URL must be a valid URL.");
    }
  }
  return errors.length ? { errors } : { location };
}

export function rowToLocation(row) {
  return {
    id: row.id,
    name: row.name,
    suburb: row.suburb,
    address: row.address,
    latitude: row.latitude == null ? null : Number(row.latitude),
    longitude: row.longitude == null ? null : Number(row.longitude),
    googleMapsUrl: row.google_maps_url || null,
  };
}
