import { getPublishedEventUrls } from "../shared/event-store.js";
import { SITE_URL, escapeHtml } from "../shared/public-pages.js";

export async function onRequestGet({ env }) {
  const events = await getPublishedEventUrls(env.DB);
  const entries = ["/", "/events/", "/private-groups-retreats/", "/what-is-feminine-movement-meditation/"].map((path) => `<url><loc>${SITE_URL}${path}</loc></url>`);
  events.forEach((event) => entries.push(`<url><loc>${SITE_URL}/events/${escapeHtml(encodeURIComponent(event.slug))}/</loc>${event.updated_at ? `<lastmod>${escapeHtml(String(event.updated_at).replace(" ", "T"))}Z</lastmod>` : ""}</url>`));
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.join("")}</urlset>`, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
