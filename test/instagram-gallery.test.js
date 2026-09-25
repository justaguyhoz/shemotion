import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import {
  FEATURED_INSTAGRAM_POSTS,
  INSTAGRAM_PROFILE_URL,
  injectInstagramGallery,
} from "../shared/instagram-gallery.js";

test("curated Instagram gallery uses three verified Shemotion posts and local images", async () => {
  assert.equal(FEATURED_INSTAGRAM_POSTS.length, 3);
  assert.deepEqual(FEATURED_INSTAGRAM_POSTS.map(({ url }) => url), [
    "https://www.instagram.com/shemotion.au/reel/DaHg1VgsNw8/",
    "https://www.instagram.com/shemotion.au/p/DdlfA3SRB2c/",
    "https://www.instagram.com/shemotion.au/reel/DccwuXITHcL/",
  ]);
  assert.equal(INSTAGRAM_PROFILE_URL, "https://www.instagram.com/shemotion.au/");

  await Promise.all(FEATURED_INSTAGRAM_POSTS.map(async (post) => {
    assert.match(post.url, /^https:\/\/www\.instagram\.com\/shemotion\.au\/(?:p|reel)\/[A-Za-z0-9_-]+\/$/);
    assert.match(post.image, /^assets\/[A-Za-z0-9_-]+\.jpg$/);
    assert.ok(post.alt.length > 20);
    assert.ok(post.width > 0 && post.height > 0);
    await access(new URL(`../${post.image}`, import.meta.url));
  }));
});

test("homepage build injects accessible static Instagram cards between Contact and FAQs", async () => {
  const source = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const rendered = injectInstagramGallery(source);
  const contactIndex = rendered.indexOf('<section class="contact');
  const instagramIndex = rendered.indexOf('<section class="instagram');
  const faqIndex = rendered.indexOf('<section class="faq');

  assert.ok(contactIndex >= 0 && contactIndex < instagramIndex && instagramIndex < faqIndex);
  assert.equal((rendered.match(/class="instagram-card"/g) || []).length, 3);
  assert.equal((rendered.match(/loading="lazy"/g) || []).length >= 3, true);
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

  assert.match(css, /\.instagram-card-media[\s\S]*aspect-ratio:\s*4\s*\/\s*5/);
  assert.match(css, /@media \(max-width: 700px\)[\s\S]*\.instagram-grid[\s\S]*overflow-x:\s*auto[\s\S]*scrollbar-width:\s*none/);
  assert.match(css, /\.instagram-grid::\-webkit-scrollbar[\s\S]*display:\s*none/);
  assert.match(css, /@media \(hover: hover\) and \(pointer: fine\) and \(prefers-reduced-motion: no-preference\)[\s\S]*\.instagram-card:hover/);
  assert.match(script, /\.instagram \[data-reveal\]/);
  assert.match(script, /export function setupInstagramGallery/);
  assert.match(script, /grid\.scrollTo\(\{ left: cardOffset\(cards\[target\]\), behavior:/);
  assert.match(script, /setupInstagramGallery\(\)/);
});
