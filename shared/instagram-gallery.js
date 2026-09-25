export const INSTAGRAM_PROFILE_URL = "https://www.instagram.com/shemotion.au/";
export const INSTAGRAM_GALLERY_MARKER = "<!-- INSTAGRAM_GALLERY_CARDS -->";

// Update these three records to change the featured homepage posts.
export const FEATURED_INSTAGRAM_POSTS = Object.freeze([
  Object.freeze({
    type: "Reel",
    title: "Movement in practice",
    description: "A glimpse of feminine movement and expression with Shemotion.",
    url: "https://www.instagram.com/shemotion.au/reel/DaHg1VgsNw8/",
    image: "assets/about-katty.jpg",
    width: 751,
    height: 768,
    position: "50% 44%",
    alt: "Katty holding a grounded movement pose in a light studio",
  }),
  Object.freeze({
    type: "Post",
    title: "What Shemotion is",
    description: "Movement meditation for release, reconnection and inner confidence.",
    url: "https://www.instagram.com/shemotion.au/p/DdlfA3SRB2c/",
    image: "assets/studio-1.jpg",
    width: 896,
    height: 1195,
    position: "50% 42%",
    alt: "Katty seated in a movement studio with a small group behind her",
  }),
  Object.freeze({
    type: "Reel",
    title: "Reconnect with your body",
    description: "A softer invitation to listen to your body rather than push harder.",
    url: "https://www.instagram.com/shemotion.au/reel/DccwuXITHcL/",
    image: "assets/back-home.jpg",
    width: 1264,
    height: 843,
    position: "50% 50%",
    alt: "Katty and another woman pausing with hands over their hearts",
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
  return posts.map((post) => `
          <a class="instagram-card" href="${escapeHtml(post.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(post.title)} - opens Instagram in a new tab">
            <span class="instagram-card-media" style="--instagram-position: ${escapeHtml(post.position)}">
              <img src="${escapeHtml(post.image)}" alt="${escapeHtml(post.alt)}" width="${post.width}" height="${post.height}" loading="lazy" decoding="async">
              ${post.type === "Reel" ? '<span class="instagram-reel-mark" aria-hidden="true"><span></span></span>' : ""}
            </span>
            <span class="instagram-card-copy">
              <span class="instagram-card-type">${escapeHtml(post.type)}</span>
              <strong>${escapeHtml(post.title)}</strong>
              <span>${escapeHtml(post.description)}</span>
              <span class="instagram-card-link">View on Instagram <span aria-hidden="true">↗</span></span>
            </span>
          </a>`).join("");
}

export function injectInstagramGallery(html, posts = FEATURED_INSTAGRAM_POSTS) {
  if (!html.includes(INSTAGRAM_GALLERY_MARKER)) return html;
  return html.replace(INSTAGRAM_GALLERY_MARKER, renderInstagramGalleryCards(posts));
}
