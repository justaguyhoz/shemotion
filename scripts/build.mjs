import { basename } from "node:path";
import { cp, mkdir, rm } from "node:fs/promises";

const output = new URL("../dist/", import.meta.url);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const file of ["index.html", "styles.css", "script.js", "tracking.js", "public-page.js", "navigation.js", "calendar.js", "recurrence.js", "event-lifecycle.js", "robots.txt"]) {
  await cp(new URL(`../${file}`, import.meta.url), new URL(file, output));
}

const excludedPhotos = new Set(["about-me-pic.jpg", "cardio-release.jpg", "cardio.jpg", "feel.jpg"]);
// Retain original photographs in the repository without deploying unused files.
await cp(new URL("../assets/", import.meta.url), new URL("assets/", output), {
  recursive: true,
  filter: (source) => !excludedPhotos.has(basename(source)),
});

for (const directory of ["admin", "private-groups-retreats", "what-is-feminine-movement-meditation"]) {
  await cp(new URL(`../${directory}/`, import.meta.url), new URL(`${directory}/`, output), { recursive: true });
}
