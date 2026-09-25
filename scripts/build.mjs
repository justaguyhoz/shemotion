import { basename } from "node:path";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { injectGoogleTag } from "../shared/google-tag.js";

const output = new URL("../dist/", import.meta.url);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const file of ["index.html", "styles.css", "script.js", "tracking.js", "public-page.js", "navigation.js", "attribution.js", "calendar.js", "recurrence.js", "event-lifecycle.js", "robots.txt"]) {
  await cp(new URL(`../${file}`, import.meta.url), new URL(file, output));
}

const excludedPhotos = new Set(["about-me-pic.jpg", "cardio-release.jpg", "cardio.jpg", "feel.jpg"]);
// Retain original photographs in the repository without deploying unused files.
await cp(new URL("../assets/", import.meta.url), new URL("assets/", output), {
  recursive: true,
  filter: (source) => !excludedPhotos.has(basename(source)),
});

for (const directory of ["admin", "private-groups-retreats", "what-is-feminine-movement-meditation", "privacy", "terms", "cancellations-refunds"]) {
  await cp(new URL(`../${directory}/`, import.meta.url), new URL(`${directory}/`, output), { recursive: true });
}

for (const path of ["index.html", "private-groups-retreats/index.html", "what-is-feminine-movement-meditation/index.html", "privacy/index.html", "terms/index.html", "cancellations-refunds/index.html"]) {
  const file = new URL(path, output);
  const html = await readFile(file, "utf8");
  await writeFile(file, injectGoogleTag(html));
}
