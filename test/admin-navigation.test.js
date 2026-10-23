import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pages = [
  ["admin/index.html", "events", "admin-navigation.js"],
  ["admin/media/index.html", "media", "../admin-navigation.js"],
  ["admin/instagram/index.html", "instagram", "../admin-navigation.js"],
  ["admin/contacts/index.html", "contacts", "../admin-navigation.js"],
  ["admin/outreach/index.html", "outreach", "../admin-navigation.js"],
];

test("every admin page uses the shared complete navigation", async () => {
  for (const [path, currentPage, scriptPath] of pages) {
    const html = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
    assert.match(html, new RegExp(`data-admin-navigation data-current-page="${currentPage}"`));
    assert.match(html, new RegExp(`src="${scriptPath.replaceAll(".", "\\.")}`));
    assert.match(html, /admin-navigation\.css/);
    assert.equal((html.match(/aria-label="Admin navigation"/g) || []).length, 1);
  }
});

test("shared admin navigation keeps the required order and active semantics", async () => {
  const source = await readFile(new URL("../admin/admin-navigation.js", import.meta.url), "utf8");
  const labels = ["Events", "Media & Features", "Instagram", "Contacts", "Outreach", "View Website"];
  let previousIndex = -1;
  for (const label of labels) {
    const index = source.indexOf(`label: "${label}"`);
    assert.ok(index > previousIndex, `${label} should appear in the required order`);
    previousIndex = index;
  }
  assert.match(source, /aria-current/);
  assert.match(source, /aria-expanded/);
  assert.match(source, /event\.key === "Escape"/);
});

test("shared admin navigation provides desktop, mobile and active styles", async () => {
  const css = await readFile(new URL("../admin/admin-navigation.css", import.meta.url), "utf8");
  assert.match(css, /\.admin-nav-link\.is-active/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /\.admin-navigation\.is-open \.admin-nav-links/);
  assert.match(css, /:focus-visible/);
});
