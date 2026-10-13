import {
  mediaFeatureValues,
  mediaJsonResponse,
  mediaThumbnailKey,
  rowToMediaFeature,
  validateMediaFeatureInput,
} from "../../../../shared/media-features.js";

function parseId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

async function removeManagedThumbnail(env, url) {
  const key = mediaThumbnailKey(url);
  if (key && env.EVENT_MEDIA) await env.EVENT_MEDIA.delete(key).catch(() => {});
}

export async function onRequestPut({ request, env, params }) {
  const id = parseId(params.id);
  if (!id) return mediaJsonResponse({ error: "Invalid media item ID." }, 400);
  let input;
  try {
    input = await request.json();
  } catch {
    return mediaJsonResponse({ error: "A valid JSON body is required." }, 400);
  }
  const validation = validateMediaFeatureInput(input);
  if (validation.errors) return mediaJsonResponse({ error: "Validation failed.", details: validation.errors }, 400);

  try {
    const existing = await env.DB.prepare("SELECT thumbnail_url FROM media_features WHERE id = ?").bind(id).first();
    if (!existing) return mediaJsonResponse({ error: "Media item not found." }, 404);
    const row = await env.DB.prepare(`
      UPDATE media_features SET
        title = ?, publisher = ?, media_type = ?, external_url = ?, short_description = ?,
        thumbnail_url = ?, image_alt = ?, publication_date = ?, contribution_type = ?,
        status = ?, is_featured = ?, display_order = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING *
    `).bind(...mediaFeatureValues(validation.item), id).first();
    if (existing.thumbnail_url && existing.thumbnail_url !== validation.item.thumbnailUrl) {
      await removeManagedThumbnail(env, existing.thumbnail_url);
    }
    return mediaJsonResponse({ item: rowToMediaFeature(row) });
  } catch {
    return mediaJsonResponse({ error: "The media item could not be updated." }, 500);
  }
}

export async function onRequestDelete({ env, params }) {
  const id = parseId(params.id);
  if (!id) return mediaJsonResponse({ error: "Invalid media item ID." }, 400);
  try {
    const existing = await env.DB.prepare("SELECT thumbnail_url FROM media_features WHERE id = ?").bind(id).first();
    if (!existing) return mediaJsonResponse({ error: "Media item not found." }, 404);
    await env.DB.prepare("DELETE FROM media_features WHERE id = ?").bind(id).run();
    await removeManagedThumbnail(env, existing.thumbnail_url);
    return new Response(null, { status: 204 });
  } catch {
    return mediaJsonResponse({ error: "The media item could not be deleted." }, 500);
  }
}
