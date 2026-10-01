import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import {
  FEATURED_INSTAGRAM_POSTS,
  INSTAGRAM_GRID_IMAGE,
  INSTAGRAM_PROFILE_URL,
  injectInstagramGallery,
} from "../shared/instagram-gallery.js";

test("curated Instagram gallery uses nine distinct Shemotion grid covers", async () => {
  assert.equal(FEATURED_INSTAGRAM_POSTS.length, 9);
  assert.equal(INSTAGRAM_PROFILE_URL, "https://www.instagram.com/shemotion.au/");
  assert.equal(INSTAGRAM_GRID_IMAGE, "assets/instagram-grid-covers.jpg");
  assert.equal(new Set(FEATURED_INSTAGRAM_POSTS.map(({ title }) => title)).size, 9);
  assert.equal(new Set(FEATURED_INSTAGRAM_POSTS.map(({ spriteLeft, spriteTop }) => `${spriteLeft}:${spriteTop}`)).size, 9);

  await Promise.all(FEATURED_INSTAGRAM_POSTS.map(async (post) => {
    assert.match(post.url, /^https:\/\/www\.instagram\.com\/shemotion\.au\/(?:$|(?:p|reel)\/[A-Za-z0-9_-]+\/$)/);
    assert.match(post.spriteLeft, /^-(?:100|200)%$|^0%$/);
    assert.match(post.spriteTop, /^-(?:87\.5|187\.5|287\.5)%$/);
  }));
  await access(new URL(`../${INSTAGRAM_GRID_IMAGE}`, import.meta.url));
});

test("homepage build injects accessible static Instagram cards between Contact and FAQs", async () => {
  const source = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const rendered = injectInstagramGallery(source);
  const contactIndex = rendered.indexOf('<section class="contact');
  const instagramIndex = rendered.indexOf('<section class="instagram');
  const faqIndex = rendered.indexOf('<section class="faq');

  assert.ok(contactIndex >= 0 && contactIndex < instagramIndex && instagramIndex < faqIndex);
  assert.equal((rendered.match(/class="instagram-card"/g) || []).length, 18);
  assert.equal((rendered.match(/loading="lazy"/g) || []).length >= 18, true);
  assert.match(rendered, /class="instagram-track"/);
  assert.match(rendered, /aria-hidden="true" tabindex="-1"/);
  assert.doesNotMatch(rendered, /instagram-card-copy|View on Instagram/);
  assert.equal((rendered.match(/target="_blank" rel="noopener noreferrer"/g) || []).length >= 4, true);
  assert.doesNotMatch(rendered, /INSTAGRAM_GALLERY_CARDS/);
  assert.match(rendered, /Follow Shemotion/);
  assert.match(rendered, /Movement, upcoming experiences and a closer look at what Shemotion feels like\./);
  assert.match(rendered, /href="https:\/\/www\.instagram\.com\/shemotion\.au\/"[^>]*>Follow @shemotion\.au/);
  assert.doesNotMatch(rendered, /followers|like count|comment count|instagram-media|instagram\.com\/embed\.js/i);
});

test("Instagram gallery reserves media dimensions and has responsive accessible styling", async () => {
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  const script = await readFile(new URL("../script.js", import.meta.url), "utf8");

  assert.match(css, /\.instagram-card-media[\s\S]*aspect-ratio:\s*3\s*\/\s*4/);
  assert.match(css, /@media \(max-width: 700px\)[\s\S]*\.instagram-grid[\s\S]*overflow:\s*hidden[\s\S]*touch-action:\s*pan-y/);
  assert.match(css, /@media \(max-width: 700px\)[\s\S]*\.instagram-track[\s\S]*animation:\s*instagram-stream 32s linear infinite/);
  assert.match(css, /@media \(max-width: 700px\)[\s\S]*\.instagram-card-group[\s\S]*gap:\s*8px[\s\S]*padding-right:\s*8px/);
  assert.match(css, /@media \(max-width: 700px\)[\s\S]*\.instagram-card[\s\S]*clamp\(72px, 23vw, 100px\)/);
  assert.match(css, /\.instagram-grid::\-webkit-scrollbar[\s\S]*display:\s*none/);
  assert.match(css, /@media \(hover: hover\) and \(pointer: fine\) and \(prefers-reduced-motion: no-preference\)[\s\S]*\.instagram-card:hover/);
  assert.match(script, /\.instagram \[data-reveal\]/);
  assert.match(script, /export function setupInstagramGallery/);
  assert.match(css, /@keyframes instagram-stream/);
  assert.match(css, /translateX\(-50%\)/);
  assert.match(css, /animation:\s*instagram-stream 40s linear infinite/);
  assert.match(css, /\.instagram-track\s*\{[\s\S]*gap:\s*0[\s\S]*animation:\s*instagram-stream 40s linear infinite/);
  assert.match(css, /@media \(hover: hover\) and \(pointer: fine\) and \(prefers-reduced-motion: no-preference\)[\s\S]*\.instagram-grid:hover \.instagram-track,[\s\S]*animation-play-state:\s*paused/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.instagram-track[\s\S]*animation:\s*none[\s\S]*\.instagram-grid[\s\S]*overflow-x:\s*auto/);
  assert.match(script, /grid\.setAttribute\("aria-label", "Featured Instagram posts"\)/);
  assert.match(script, /setupInstagramGallery\(\)/);
});
