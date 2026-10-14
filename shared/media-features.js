export const MEDIA_TYPES = ["article", "podcast", "interview", "other"];
export const CONTRIBUTION_TYPES = [
  "written_by_katty",
  "interview_with_katty",
  "independent_coverage",
  "podcast_guest",
  "other",
];
export const MEDIA_STATUSES = ["draft", "published"];

const LIMITS = {
  title: 180,
  publisher: 120,
  externalUrl: 1000,
  shortDescription: 400,
  thumbnailUrl: 500,
  imageAlt: 180,
};

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.valueOf()) && date.toISOString().startsWith(value);
}

function safeHttpsUrl(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function safeThumbnailUrl(value) {
  return (value.startsWith("/") && !value.startsWith("//")) || safeHttpsUrl(value);
}

export function validateMediaFeatureInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { errors: ["A valid media item is required."] };
  }

  const item = {
    title: cleanText(input.title),
    publisher: cleanText(input.publisher),
    mediaType: cleanText(input.mediaType).toLowerCase(),
    externalUrl: cleanText(input.externalUrl),
    shortDescription: cleanText(input.shortDescription),
    thumbnailUrl: cleanText(input.thumbnailUrl) || null,
    imageAlt: cleanText(input.imageAlt) || null,
    publicationDate: cleanText(input.publicationDate) || null,
    contributionType: cleanText(input.contributionType).toLowerCase(),
    status: cleanText(input.status).toLowerCase() || "draft",
    isFeatured: input.isFeatured === true || input.isFeatured === 1,
    displayOrder: Number.isInteger(Number(input.displayOrder)) ? Number(input.displayOrder) : 0,
  };
  const errors = [];

  if (!item.title) errors.push("title is required.");
  if (!item.publisher) errors.push("publisher is required.");
  if (!item.externalUrl) errors.push("externalUrl is required.");
  for (const [field, limit] of Object.entries(LIMITS)) {
    const value = item[field];
    if (value && value.length > limit) errors.push(`${field} is too long.`);
  }
  if (!MEDIA_TYPES.includes(item.mediaType)) errors.push("mediaType is invalid.");
  if (!CONTRIBUTION_TYPES.includes(item.contributionType)) errors.push("contributionType is invalid.");
  if (!MEDIA_STATUSES.includes(item.status)) errors.push("status is invalid.");
  if (item.externalUrl && !safeHttpsUrl(item.externalUrl)) errors.push("externalUrl must be a valid https URL.");
  if (item.thumbnailUrl && !safeThumbnailUrl(item.thumbnailUrl)) {
    errors.push("thumbnailUrl must be a valid https URL or root-relative site path.");
  }
  if (item.thumbnailUrl && !item.imageAlt) errors.push("imageAlt is required when a thumbnail is used.");
  if (item.publicationDate && !validDate(item.publicationDate)) errors.push("publicationDate must be a valid date.");
  if (item.displayOrder < -1000 || item.displayOrder > 1000) errors.push("displayOrder must be between -1000 and 1000.");

  return errors.length ? { errors } : { item };
}

export function rowToMediaFeature(row) {
  return {
    id: row.id,
    title: row.title,
    publisher: row.publisher,
    mediaType: row.media_type,
    externalUrl: row.external_url,
    shortDescription: row.short_description || "",
    thumbnailUrl: row.thumbnail_url || null,
    imageAlt: row.image_alt || null,
    publicationDate: row.publication_date || null,
    contributionType: row.contribution_type,
    status: row.status,
    isFeatured: row.is_featured === 1,
    displayOrder: Number(row.display_order) || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mediaFeatureValues(item) {
  return [
    item.title,
    item.publisher,
    item.mediaType,
    item.externalUrl,
    item.shortDescription,
    item.thumbnailUrl,
    item.imageAlt,
    item.publicationDate,
    item.contributionType,
    item.status,
    item.isFeatured ? 1 : 0,
    item.displayOrder,
  ];
}

export function mediaJsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export function mediaThumbnailKey(url) {
  const match = /^\/media\/features\/([^/?#]+)$/.exec(String(url || ""));
  return match ? `features/${match[1]}` : null;
}

export function mediaCtaLabel(mediaType) {
  if (mediaType === "article") return "Read article";
  if (mediaType === "podcast") return "Listen to podcast";
  if (mediaType === "interview") return "View interview";
  return "View feature";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderMediaFeatureCard(item, index = 0) {
  const title = escapeHtml(item.title);
  const publisher = escapeHtml(item.publisher);
  // This existing fallback artwork is not an approved publication identity.
  // Keep the stored asset intact; a future approved upload uses the normal image path.
  const fallbackArtwork = "/media/features/060abb3e-e2ee-4ce7-ae5f-492c8dc24958.webp";
  const hasIdentity = item.thumbnailUrl && item.thumbnailUrl !== fallbackArtwork;
  const image = hasIdentity
    ? `<img src="${escapeHtml(item.thumbnailUrl)}" alt="${escapeHtml(item.imageAlt)}" width="400" height="400" loading="lazy" decoding="async">`
    : `<span class="media-feature-fallback">${publisher}</span>`;
  const aria = `${mediaCtaLabel(item.mediaType)}: ${item.title} on ${item.publisher} (opens in a new tab)`;
  const tile = `tile-${(index % 4) + 1}`;

  return `<article class="media-feature-card ${tile}">
    <a class="media-feature-link" href="${escapeHtml(item.externalUrl)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(aria)}" data-media-outbound data-media-id="${escapeHtml(item.id)}" data-media-type="${escapeHtml(item.mediaType)}" data-media-publisher="${publisher}" data-media-title="${title}">
      <span class="media-feature-thumbnail">${image}</span>
      <span class="media-feature-content">${hasIdentity ? `<span class="media-feature-publisher">${publisher}</span>` : ""}<span class="media-feature-title">${title}</span><span class="media-feature-arrow" aria-hidden="true">&nearr;</span></span>
    </a>
  </article>`;
}

export function renderMediaFeaturesSection(items) {
  if (!items?.length) return "";
  const single = items.length === 1 ? " is-single" : items.length >= 4 ? " is-many" : "";
  return `<section class="media-features section-pad" aria-labelledby="media-features-title">
    <div class="section-heading">
      <h2 id="media-features-title">Articles, podcasts and more about Shemotion</h2>
    </div>
    <div class="media-feature-grid${single}">
      ${items.map(renderMediaFeatureCard).join("\n      ")}
    </div>
  </section>`;
}

export async function getHomepageMediaFeatures(db) {
  const result = await db.prepare(`
    SELECT * FROM media_features
    WHERE status = 'published' AND is_featured = 1
    ORDER BY display_order ASC, publication_date DESC, id DESC
  `).all();
  return result.results.map(rowToMediaFeature);
}
