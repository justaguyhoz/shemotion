import { cp, mkdir, rm } from "node:fs/promises";

const output = new URL("../dist/", import.meta.url);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const file of ["index.html", "styles.css", "script.js"]) {
  await cp(new URL(`../${file}`, import.meta.url), new URL(file, output));
}

for (const directory of ["assets", "admin"]) {
  await cp(new URL(`../${directory}/`, import.meta.url), new URL(`${directory}/`, output), { recursive: true });
}
