import { jsonResponse } from "../../../../shared/events.js";
import { placeDetailsToLocation } from "../../../../shared/google-places.js";

export async function onRequestPost({ request, env, params }) {
  if (!env.GOOGLE_MAPS_API_KEY) return jsonResponse({ error: "Google business search is not configured yet." }, 503);
  let input = {};
  try { input = await request.json(); } catch { /* Session token is optional. */ }
  const id = String(params.id || "").trim();
  if (!id || id.length > 300) return jsonResponse({ error: "Invalid Google place." }, 400);
  const fields = "id,displayName,formattedAddress,addressComponents,location,googleMapsUri";
  const url = new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(id)}`);
  url.searchParams.set("languageCode", "en");
  url.searchParams.set("regionCode", "AU");
  if (input.sessionToken) url.searchParams.set("sessionToken", input.sessionToken);
  const response = await fetch(url, {
    headers: { "X-Goog-Api-Key": env.GOOGLE_MAPS_API_KEY, "X-Goog-FieldMask": fields },
  });
  if (!response.ok) return jsonResponse({ error: "Google could not load that business listing." }, 502);
  return jsonResponse({ location: placeDetailsToLocation(await response.json()) });
}

