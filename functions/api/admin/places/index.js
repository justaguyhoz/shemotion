import { jsonResponse } from "../../../../shared/events.js";
import { placePredictionSummary } from "../../../../shared/google-places.js";

export async function onRequestPost({ request, env }) {
  if (!env.GOOGLE_MAPS_API_KEY) return jsonResponse({ error: "Google business search is not configured yet." }, 503);
  let input;
  try { input = await request.json(); } catch { return jsonResponse({ error: "A valid JSON body is required." }, 400); }
  const query = String(input.query || "").trim();
  if (query.length < 3 || query.length > 200) return jsonResponse({ error: "Enter at least 3 characters." }, 400);

  const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-Goog-Api-Key": env.GOOGLE_MAPS_API_KEY,
      "X-Goog-FieldMask": "suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat",
    },
    body: JSON.stringify({
      input: query,
      includedRegionCodes: ["au"],
      regionCode: "AU",
      languageCode: "en",
      sessionToken: input.sessionToken || undefined,
    }),
  });
  if (!response.ok) return jsonResponse({ error: "Google business search is temporarily unavailable." }, 502);
  const data = await response.json();
  return jsonResponse({ places: (data.suggestions || []).map(placePredictionSummary).filter(Boolean) });
}

