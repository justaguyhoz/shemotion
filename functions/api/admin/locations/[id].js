import { jsonResponse } from "../../../../shared/events.js";
import { rowToLocation, validateLocationInput } from "../../../../shared/locations.js";

function parseId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function onRequestPut({ request, env, params }) {
  const id = parseId(params.id);
  if (!id) return jsonResponse({ error: "Invalid location ID." }, 400);

  let input;
  try {
    input = await request.json();
  } catch {
    return jsonResponse({ error: "A valid JSON body is required." }, 400);
  }
  const validation = validateLocationInput(input);
  if (validation.errors) return jsonResponse({ error: "Validation failed.", details: validation.errors }, 400);

  try {
    const { name, suburb, address, latitude, longitude, googleMapsUrl } = validation.location;
    const result = await env.DB.prepare(`
      UPDATE locations
      SET name = ?, suburb = ?, address = ?, latitude = ?, longitude = ?, google_maps_url = ?
      WHERE id = ?
      RETURNING *
    `).bind(name, suburb, address, latitude, longitude, googleMapsUrl, id).first();
    if (!result) return jsonResponse({ error: "Location not found." }, 404);
    return jsonResponse({ location: rowToLocation(result) });
  } catch {
    return jsonResponse({ error: "The location could not be updated." }, 500);
  }
}
