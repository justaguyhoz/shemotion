export const INSTAGRAM_PROFILE_URL = "https://www.instagram.com/shemotion.au/";
export const INSTAGRAM_GALLERY_MARKER = "<!-- INSTAGRAM_GALLERY_CARDS -->";

// A lightweight snapshot of the current Shemotion Instagram grid. The full grid
// image is downloaded once, then each card exposes one distinct cover crop.
export const INSTAGRAM_GRID_IMAGE = "assets/instagram-grid-covers.jpg";

export const FEATURED_INSTAGRAM_POSTS = Object.freeze([
  Object.freeze({
    title: "What is Shemotion?",
    url: "https://www.instagram.com/shemotion.au/p/DdlfA3SRB2c/",
    spriteLeft: "0%",
    spriteTop: "-87.5%",
  }),
  Object.freeze({
    title: "Make fire within",
    url: INSTAGRAM_PROFILE_URL,
    spriteLeft: "-100%",
    spriteTop: "-87.5%",
  }),
  Object.freeze({
    title: "You do not need to fix yourself",
    url: INSTAGRAM_PROFILE_URL,
    spriteLeft: "-200%",
    spriteTop: "-87.5%",
  }),
  Object.freeze({
    title: "Movement outdoors",
    url: "https://www.instagram.com/shemotion.au/reel/DccwuXITHcL/",
    spriteLeft: "0%",
    spriteTop: "-187.5%",
  }),
  Object.freeze({
    title: "What is happening?",
    url: INSTAGRAM_PROFILE_URL,
    spriteLeft: "-100%",
    spriteTop: "-187.5%",
  }),
  Object.freeze({
    title: "Where to find Shemotion",
    url: INSTAGRAM_PROFILE_URL,
    spriteLeft: "-200%",
    spriteTop: "-187.5%",
  }),
  Object.freeze({
    title: "Movement in practice",
    url: INSTAGRAM_PROFILE_URL,
    spriteLeft: "0%",
    spriteTop: "-287.5%",
  }),
  Object.freeze({
    title: "Feeling connected to yourself",
    url: INSTAGRAM_PROFILE_URL,
    spriteLeft: "-100%",
    spriteTop: "-287.5%",
  }),
  Object.freeze({
    title: "Your hips hold your power",
    url: "https://www.instagram.com/shemotion.au/reel/DaHg1VgsNw8/",
    spriteLeft: "-200%",
    spriteTop: "-287.5%",
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
  const cards = () => posts.map((post) => `
          <a class="instagram-card" href="${escapeHtml(post.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(post.title)} - opens Instagram in a new tab">
            <span class="instagram-card-media">
              <img class="instagram-cover-sprite" src="${INSTAGRAM_GRID_IMAGE}" alt="" width="592" height="1280" loading="lazy" decoding="async" style="--instagram-sprite-left: ${post.spriteLeft}; --instagram-sprite-top: ${post.spriteTop}">
            </span>
          </a>`).join("");
  const duplicates = cards().replaceAll('<a class="instagram-card"', '<a class="instagram-card" aria-hidden="true" tabindex="-1"');
  return `<div class="instagram-track"><div class="instagram-card-group">${cards()}</div><div class="instagram-card-group" aria-hidden="true">${duplicates}</div></div>`;
}

export function injectInstagramGallery(html, posts = FEATURED_INSTAGRAM_POSTS) {
  if (!html.includes(INSTAGRAM_GALLERY_MARKER)) return html;
  return html.replace(INSTAGRAM_GALLERY_MARKER, renderInstagramGalleryCards(posts));
}
