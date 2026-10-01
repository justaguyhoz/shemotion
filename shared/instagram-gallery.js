export const INSTAGRAM_PROFILE_URL = "https://www.instagram.com/shemotion.au/";
export const INSTAGRAM_GALLERY_MARKER = "<!-- INSTAGRAM_GALLERY_CARDS -->";

// Verified Shemotion posts with their exact Instagram cover artwork stored locally.
export const FEATURED_INSTAGRAM_POSTS = Object.freeze([
  Object.freeze({
    type: "Reel",
    title: "Movement in practice",
    description: "A glimpse of feminine movement and expression with Shemotion.",
    url: "https://www.instagram.com/shemotion.au/reel/DaHg1VgsNw8/",
    image: "assets/instagram-DaHg1VgsNw8.jpg",
    width: 360,
    height: 640,
    position: "50% 50%",
    alt: "Shemotion reel cover about reconnecting with the wisdom held in the hips",
  }),
  Object.freeze({
    type: "Post",
    title: "What Shemotion is",
    description: "Movement meditation for release, reconnection and inner confidence.",
    url: "https://www.instagram.com/shemotion.au/p/DdlfA3SRB2c/",
    image: "assets/instagram-DdlfA3SRB2c.jpg",
    width: 640,
    height: 640,
    position: "50% 50%",
    alt: "Shemotion post cover explaining feminine movement meditation",
  }),
  Object.freeze({
    type: "Reel",
    title: "Reconnect with your body",
    description: "A softer invitation to listen to your body rather than push harder.",
    url: "https://www.instagram.com/shemotion.au/reel/DccwuXITHcL/",
    image: "assets/instagram-DccwuXITHcL.jpg",
    width: 360,
    height: 640,
    position: "50% 50%",
    alt: "Shemotion reel cover showing a woman moving outdoors",
  }),
]);

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderInstagramGalleryCards(posts = FEATURED_INSTAGRAM_POSTS) {
  const cards = (duplicate = false) => posts.map((post) => `
          <a class="instagram-card" href="${escapeHtml(post.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(post.title)} - opens Instagram in a new tab">
            <span class="instagram-card-media" style="--instagram-position: ${escapeHtml(post.position)}">
              <img src="${escapeHtml(post.image)}" alt="${escapeHtml(post.alt)}" width="${post.width}" height="${post.height}" loading="lazy" decoding="async">
              ${post.type === "Reel" ? '<span class="instagram-reel-mark" aria-hidden="true"><span></span></span>' : ""}
            </span>
          </a>`).join("");
  const duplicates = cards(true).replaceAll('<a class="instagram-card"', '<a class="instagram-card" aria-hidden="true" tabindex="-1"');
  return `<div class="instagram-track"><div class="instagram-card-group">${cards()}</div><div class="instagram-card-group" aria-hidden="true">${duplicates}</div></div>`;
}

export function injectInstagramGallery(html, posts = FEATURED_INSTAGRAM_POSTS) {
  if (!html.includes(INSTAGRAM_GALLERY_MARKER)) return html;
  return html.replace(INSTAGRAM_GALLERY_MARKER, renderInstagramGalleryCards(posts));
}
