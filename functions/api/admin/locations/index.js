import { jsonResponse } from "../../../../shared/events.js";
import { rowToLocation, validateLocationInput } from "../../../../shared/locations.js";

export async function onRequestGet({ env }) {
  try {
    const result = await env.DB.prepare("SELECT * FROM locations ORDER BY name COLLATE NOCASE ASC").all();
    return jsonResponse({ locations: result.results.map(rowToLocation) });
  } catch {
    return jsonResponse({ error: "Locations could not be loaded." }, 500);
  }
}

export async function onRequestPost({ request, env }) {
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
    const existing = await env.DB.prepare(
      "SELECT * FROM locations WHERE name = ?1 COLLATE NOCASE AND address = ?2 COLLATE NOCASE"
    ).bind(name, address).first();
    if (existing) return jsonResponse({ location: rowToLocation(existing) });
    const result = await env.DB.prepare(
      "INSERT INTO locations (name, suburb, address, latitude, longitude, google_maps_url) VALUES (?1, ?2, ?3, ?4, ?5, ?6) RETURNING *"
    ).bind(name, suburb, address, latitude, longitude, googleMapsUrl).first();
    return jsonResponse({ location: rowToLocation(result) }, 201);
  } catch {
    return jsonResponse({ error: "The location could not be saved." }, 500);
  }
}
