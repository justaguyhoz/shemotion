import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  mediaCtaLabel,
  renderMediaFeaturesSection,
  validateMediaFeatureInput,
} from "../shared/media-features.js";
import { onRequestGet as renderHomepage } from "../functions/index.js";
import { detectedMediaImageType, onRequestPost as uploadMediaImage } from "../functions/api/admin/media-feature-images.js";
import { setupMediaOutboundTracking } from "../tracking.js";

const baseItem = {
  id: 1,
  title: "When Did We Stop Moving for Joy?",
  publisher: "The Times",
  mediaType: "article",
  externalUrl: "https://thetimes.com.au/example",
  shortDescription: "Katty shares her perspective.",
  thumbnailUrl: null,
  imageAlt: null,
  publicationDate: "2026-10-13",
  contributionType: "written_by_katty",
  status: "published",
  isFeatured: true,
  displayOrder: 1,
};

test("media input validates required fields, safe links and thumbnail alt text", () => {
  assert.deepEqual(validateMediaFeatureInput(baseItem).item, {
    title: baseItem.title,
    publisher: baseItem.publisher,
    mediaType: baseItem.mediaType,
    externalUrl: baseItem.externalUrl,
    shortDescription: baseItem.shortDescription,
    thumbnailUrl: null,
    imageAlt: null,
    publicationDate: baseItem.publicationDate,
    contributionType: baseItem.contributionType,
    status: baseItem.status,
    isFeatured: true,
    displayOrder: 1,
  });
  assert.ok(validateMediaFeatureInput({ ...baseItem, externalUrl: "javascript:alert(1)" }).errors);
  assert.ok(validateMediaFeatureInput({ ...baseItem, externalUrl: "http://example.com" }).errors);
  assert.ok(validateMediaFeatureInput({ ...baseItem, thumbnailUrl: "/media/features/logo.webp", imageAlt: "" }).errors);
  assert.ok(validateMediaFeatureInput({ ...baseItem, publicationDate: "2026-02-31" }).errors);
});

test("media cards are crawlable, accessible, compact and safely escaped", () => {
  assert.equal(renderMediaFeaturesSection([]), "");
  const html = renderMediaFeaturesSection([{ ...baseItem, title: "Joy <script>", publisher: "The Times & Co" }]);
  assert.match(html, /media-feature-grid is-single/);
  assert.match(html, /The Times &amp; Co/);
  assert.match(html, /Joy &lt;script&gt;/);
  assert.match(html, /target="_blank" rel="noopener noreferrer"/);
  assert.match(html, /data-media-outbound/);
  assert.match(html, /<time datetime="2026-10-13">13 October 2026<\/time>/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(renderMediaFeaturesSection([baseItem, { ...baseItem, id: 2 }]), /class="media-feature-grid">/);
  assert.equal(mediaCtaLabel("podcast"), "Listen to podcast");
});

test("homepage function injects published media and hides the section when none exist", async () => {
  const asset = () => new Response(`<main><!-- MEDIA_FEATURES_SECTION --><section id="after"></section></main>`, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
  const db = (rows) => ({ prepare: () => ({ all: async () => ({ results: rows }) }) });
  const row = {
    id: 1, title: baseItem.title, publisher: baseItem.publisher, media_type: "article",
    external_url: baseItem.externalUrl, short_description: baseItem.shortDescription,
    thumbnail_url: null, image_alt: null, publication_date: "2026-10-13",
    contribution_type: "written_by_katty", status: "published", is_featured: 1, display_order: 1,
  };
  const response = await renderHomepage({ request: new Request("https://example.test/"), env: { ASSETS: { fetch: asset }, DB: db([row]) } });
  assert.equal(response.headers.get("cache-control"), "public, max-age=0, must-revalidate");
  const withItem = await response.text();
  assert.match(withItem, /Shemotion in the Spotlight/);
  assert.ok(withItem.indexOf("Shemotion in the Spotlight") < withItem.indexOf('id="after"'));

  const empty = await (await renderHomepage({ request: new Request("https://example.test/"), env: { ASSETS: { fetch: asset }, DB: db([]) } })).text();
  assert.doesNotMatch(empty, /media-features/);
});

test("media image upload checks signatures and uses the existing R2 binding", async () => {
  assert.equal(detectedMediaImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47])), "image/png");
  assert.equal(detectedMediaImageType(new TextEncoder().encode("RIFFxxxxWEBP")), "image/webp");
  let stored;
  const body = new FormData();
  body.append("image", new File([new TextEncoder().encode("RIFFxxxxWEBP")], "logo.webp", { type: "image/webp" }));
  const response = await uploadMediaImage({
    request: new Request("https://example.test/api/admin/media-feature-images", { method: "POST", body }),
    env: { EVENT_MEDIA: { put: async (...args) => { stored = args; } } },
  });
  assert.equal(response.status, 201);
  assert.match((await response.json()).url, /^\/media\/features\/[0-9a-f-]+\.webp$/);
  assert.match(stored[0], /^features\//);
});

test("media outbound tracking sends one GA event with non-sensitive card metadata", () => {
  let click;
  const link = {
    dataset: { mediaId: "7", mediaType: "podcast", mediaPublisher: "Example", mediaTitle: "A conversation" },
    addEventListener: (name, handler) => { if (name === "click") click = handler; },
  };
  const root = { querySelectorAll: () => [link] };
  const calls = [];
  const target = { gtag: (...args) => calls.push(args) };
  setupMediaOutboundTracking(root, target);
  setupMediaOutboundTracking(root, target);
  click();
  assert.deepEqual(calls, [["event", "media_outbound_click", {
    media_id: "7", media_type: "podcast", publisher: "Example", media_title: "A conversation",
  }]]);
});

test("admin exposes the complete small media-library workflow", async () => {
  const html = await readFile(new URL("../admin/media/index.html", import.meta.url), "utf8");
  const js = await readFile(new URL("../admin/media/media.js", import.meta.url), "utf8");
  for (const name of ["title", "publisher", "mediaType", "externalUrl", "shortDescription", "thumbnailUrl", "imageAlt", "publicationDate", "contributionType", "status", "displayOrder", "isFeatured"]) {
    assert.match(html, new RegExp(`name="${name}"`));
  }
  assert.match(html, /data-image-upload/);
  assert.match(html, /data-image-remove/);
  assert.match(html, /data-delete/);
  assert.match(js, /method: id \? "PUT" : "POST"/);
  assert.match(js, /method: "DELETE"/);
  assert.match(js, /createImageBitmap/);
});

test("migration seeds the verified Times article without an unapproved logo", async () => {
  const sql = await readFile(new URL("../migrations/0012_create_media_features.sql", import.meta.url), "utf8");
  assert.match(sql, /When Did We Stop Moving for Joy\?/);
  assert.match(sql, /'2026-10-13'/);
  assert.match(sql, /'written_by_katty'/);
  assert.match(sql, /'published'/);
  assert.match(sql, /NULL,\s*NULL,\s*'2026-10-13'/);
});
