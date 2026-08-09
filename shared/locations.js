const LIMITS = {
  name: 120,
  suburb: 80,
  address: 200,
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
  };
  const errors = [];
  if (!location.name) errors.push("Location name is required.");
  if (!location.address) errors.push("Location address is required.");
  for (const [field, limit] of Object.entries(LIMITS)) {
    if (location[field]?.length > limit) errors.push(`${field} is too long.`);
  }
  return errors.length ? { errors } : { location };
}

export function rowToLocation(row) {
  return {
    id: row.id,
    name: row.name,
    suburb: row.suburb,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
  };
}
