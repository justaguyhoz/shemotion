import { getHomepageMediaFeatures, renderMediaFeaturesSection } from "../shared/media-features.js";

const MEDIA_PLACEHOLDER = "<!-- MEDIA_FEATURES_SECTION -->";

export async function onRequestGet({ request, env }) {
  const asset = await env.ASSETS.fetch(request);
  if (!asset.ok || !asset.headers.get("content-type")?.includes("text/html")) return asset;

  let section = "";
  try {
    section = renderMediaFeaturesSection(await getHomepageMediaFeatures(env.DB));
  } catch {
    // Keep the homepage available and hide the optional section before migration.
  }

  const html = (await asset.text()).replace(MEDIA_PLACEHOLDER, section);
  const headers = new Headers(asset.headers);
  headers.delete("content-length");
  // Revalidate the database-backed homepage so admin publishing changes are visible immediately.
  headers.set("cache-control", "public, max-age=0, must-revalidate");
  return new Response(html, { status: asset.status, statusText: asset.statusText, headers });
}
