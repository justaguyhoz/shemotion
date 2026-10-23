import { INSTAGRAM_POSTS } from "./instagram-posts.js";

export const INSTAGRAM_PROFILE_URL = "https://www.instagram.com/shemotion.au/";
export const INSTAGRAM_GALLERY_MARKER = "<!-- INSTAGRAM_GALLERY_CARDS -->";

export const FEATURED_INSTAGRAM_POSTS = Object.freeze(INSTAGRAM_POSTS.map(Object.freeze));

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderInstagramGalleryCards(posts = FEATURED_INSTAGRAM_POSTS) {
  const cards = () => posts.map((post) => `
          <a class="instagram-card" href="${escapeHtml(post.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(post.title)} - opens Instagram in a new tab">
            <span class="instagram-card-media">
              <img src="${escapeHtml(post.imageUrl)}" alt="" width="480" height="640" loading="lazy" decoding="async">
            </span>
          </a>`).join("");
  const duplicates = cards().replaceAll('<a class="instagram-card"', '<a class="instagram-card" aria-hidden="true" tabindex="-1"');
  return `<div class="instagram-track"><div class="instagram-card-group">${cards()}</div><div class="instagram-card-group" aria-hidden="true">${duplicates}</div></div>`;
}

export function injectInstagramGallery(html, posts = FEATURED_INSTAGRAM_POSTS) {
  if (!html.includes(INSTAGRAM_GALLERY_MARKER)) return html;
  return html.replace(INSTAGRAM_GALLERY_MARKER, `<!-- INSTAGRAM_LIVE_START -->${renderInstagramGalleryCards(posts)}<!-- INSTAGRAM_LIVE_END -->`);
}
