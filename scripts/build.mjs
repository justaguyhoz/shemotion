import { basename } from "node:path";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { injectGoogleTag } from "../shared/google-tag.js";
import { injectInstagramGallery } from "../shared/instagram-gallery.js";
import { pageDocument, SITE_URL } from "../shared/public-pages.js";

const output = new URL("../dist/", import.meta.url);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

// A top-level 404 disables Pages' default SPA fallback, which otherwise serves
// the homepage with status 200 for nonexistent URLs on this multipage site.
await writeFile(new URL("404.html", output), pageDocument({
  title: "Page Not Found | Shemotion",
  description: "This page is not available. Explore Shemotion's women-only movement experiences and upcoming events.",
  canonical: `${SITE_URL}/404`,
  status: 404,
  body: '<main id="top"><section class="page-hero section-pad"><div class="section-heading"><h1>A little off the path</h1><p>This page is not available. You can return home or explore our upcoming experiences.</p><div class="event-detail-actions"><a class="button" href="/">Shemotion home</a><a class="button button-ghost" href="/events/">Explore events</a></div></div></section></main>',
}));

for (const file of ["index.html", "styles.css", "v3.css", "script.js", "floral-motion.js", "tracking.js", "public-page.js", "navigation.js", "attribution.js", "calendar.js", "recurrence.js", "event-lifecycle.js", "event-booking.js", "robots.txt", "_redirects"]) {
  await cp(new URL(`../${file}`, import.meta.url), new URL(file, output));
}

const excludedPhotos = new Set(["about-me-pic.jpg", "cardio-release.jpg", "cardio.jpg", "feel.jpg"]);
// Retain original photographs in the repository without deploying unused files.
await cp(new URL("../assets/", import.meta.url), new URL("assets/", output), {
  recursive: true,
  filter: (source) => !excludedPhotos.has(basename(source)),
});

for (const directory of ["admin", "private-groups-retreats", "what-is-shemotion", "privacy", "terms", "cancellations-refunds"]) {
  await cp(new URL(`../${directory}/`, import.meta.url), new URL(`${directory}/`, output), { recursive: true });
}

for (const path of ["index.html", "private-groups-retreats/index.html", "what-is-shemotion/index.html", "privacy/index.html", "terms/index.html", "cancellations-refunds/index.html"]) {
  const file = new URL(path, output);
  const html = await readFile(file, "utf8");
  const withHomepageContent = path === "index.html" ? injectInstagramGallery(html) : html;
  await writeFile(file, injectGoogleTag(withHomepageContent));
}
