import {
  mediaFeatureValues,
  mediaJsonResponse,
  rowToMediaFeature,
  validateMediaFeatureInput,
} from "../../../../shared/media-features.js";

export async function onRequestGet({ env }) {
  try {
    const result = await env.DB.prepare(`
      SELECT * FROM media_features
      ORDER BY display_order ASC, publication_date DESC, id DESC
    `).all();
    return mediaJsonResponse({ items: result.results.map(rowToMediaFeature) });
  } catch {
    return mediaJsonResponse({ error: "Media items could not be loaded." }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  let input;
  try {
    input = await request.json();
  } catch {
    return mediaJsonResponse({ error: "A valid JSON body is required." }, 400);
  }
  const validation = validateMediaFeatureInput(input);
  if (validation.errors) return mediaJsonResponse({ error: "Validation failed.", details: validation.errors }, 400);

  try {
    const row = await env.DB.prepare(`
      INSERT INTO media_features (
        title, publisher, media_type, external_url, short_description,
        thumbnail_url, image_alt, publication_date, contribution_type,
        status, is_featured, display_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `).bind(...mediaFeatureValues(validation.item)).first();
    return mediaJsonResponse({ item: rowToMediaFeature(row) }, 201);
  } catch {
    return mediaJsonResponse({ error: "The media item could not be created." }, 500);
  }
}
