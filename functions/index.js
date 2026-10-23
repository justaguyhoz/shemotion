import { getHomepageMediaFeatures, renderMediaFeaturesSection } from "../shared/media-features.js";
import { renderInstagramGalleryCards } from "../shared/instagram-gallery.js";
import { instagramState, instagramRefreshDue, refreshInstagram } from "../shared/instagram-feed.js";

const MEDIA_PLACEHOLDER = "<!-- MEDIA_FEATURES_SECTION -->";

export async function onRequestGet({ request, env, waitUntil }) {
  const asset = await env.ASSETS.fetch(request);
  if (!asset.ok || !asset.headers.get("content-type")?.includes("text/html")) return asset;

  let section = "";
  try {
    section = renderMediaFeaturesSection(await getHomepageMediaFeatures(env.DB));
  } catch {
    // Keep the homepage available and hide the optional section before migration.
  }

  let html = (await asset.text()).replace(MEDIA_PLACEHOLDER, section);
  try {
    const state = await instagramState(env);
    html = html.replace(/<!-- INSTAGRAM_LIVE_START -->[\s\S]*?<!-- INSTAGRAM_LIVE_END -->/, () => `<!-- INSTAGRAM_LIVE_START -->${renderInstagramGalleryCards(state.posts)}<!-- INSTAGRAM_LIVE_END -->`);
    if (instagramRefreshDue(state) && waitUntil) waitUntil(refreshInstagram(env).catch(() => {}));
  } catch {
    // Keep the bundled real-account covers if storage or Instagram is unavailable.
  }
  const headers = new Headers(asset.headers);
  headers.delete("content-length");
  // Revalidate the database-backed homepage so admin publishing changes are visible immediately.
  headers.set("cache-control", "public, max-age=0, must-revalidate");
  return new Response(html, { status: asset.status, statusText: asset.statusText, headers });
}
