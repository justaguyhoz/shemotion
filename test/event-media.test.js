import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { detectedType, MAX_BYTES, onRequestPost } from "../functions/api/admin/event-images.js";
import { eventStackState } from "../script.js";
import { validateEventInput } from "../shared/events.js";

test("event stack states cover one, two and three-plus card presentations", () => {
  assert.deepEqual([0].map((index) => eventStackState(index)), ["current"]);
  assert.deepEqual([0, 1].map((index) => eventStackState(index)), ["current", "next"]);
  assert.deepEqual([0, 1, 2, 3].map((index) => eventStackState(index)), ["current", "next", "third", "after"]);
  assert.deepEqual([0, 1, 2].map((index) => eventStackState(index, 1)), ["before", "current", "next"]);
});

test("event focal position and fit validate without changing the image URL", () => {
  const base = {
    title: "Afterglow", eventType: "Workshop", venueName: "Stellar Studio Collective",
    dateStatus: "scheduled", startAt: "2099-10-23T08:30:00.000Z", audience: "Women only",
    availabilityStatus: "Coming soon", imageUrl: "/media/events/afterglow.webp",
    imageFocalX: 68, imageFocalY: 37, imageFit: "cover",
  };
  const result = validateEventInput(base);
  assert.equal(result.errors, undefined);
  assert.equal(result.event.imageUrl, base.imageUrl);
  assert.equal(result.event.imageFocalX, 68);
  assert.equal(result.event.imageFocalY, 37);
  assert.equal(result.event.imageFit, "cover");
  assert.ok(validateEventInput({ ...base, imageFocalX: 101 }).errors);
});

test("admin upload validates real image signatures and stores a site-managed URL", async () => {
  assert.equal(MAX_BYTES, 8 * 1024 * 1024);
  assert.equal(detectedType(new Uint8Array([0xff, 0xd8, 0xff])), "image/jpeg");
  assert.equal(detectedType(new TextEncoder().encode("RIFFxxxxWEBP")), "image/webp");
  let stored;
  const body = new FormData();
  body.append("image", new File([new Uint8Array([0xff, 0xd8, 0xff, 0x00])], "art.jpg", { type: "image/jpeg" }));
  const response = await onRequestPost({
    request: new Request("https://example.test/api/admin/event-images", { method: "POST", body }),
    env: { EVENT_MEDIA: { put: async (...args) => { stored = args; } } },
  });
  const result = await response.json();
  assert.equal(response.status, 201);
  assert.match(result.url, /^\/media\/events\/[0-9a-f-]+\.jpg$/);
  assert.match(stored[0], /^events\/[0-9a-f-]+\.jpg$/);
});

test("admin exposes upload, exact 4:3 previews, focal controls and no zoom control", async () => {
  const [html, css, js] = await Promise.all([
    readFile(new URL("../admin/index.html", import.meta.url), "utf8"),
    readFile(new URL("../admin/admin.css", import.meta.url), "utf8"),
    readFile(new URL("../admin/admin.js", import.meta.url), "utf8"),
  ]);
  assert.match(html, /accept="image\/jpeg,image\/png,image\/webp"/);
  assert.equal((html.match(/data-event-image-preview/g) || []).length >= 3, true);
  assert.match(css, /\.event-image-preview[\s\S]*aspect-ratio:\s*4 \/ 3/);
  assert.match(js, /createImageBitmap/);
  assert.match(js, /setPointerCapture/);
  assert.doesNotMatch(html, /name="imageZoom"/);
});
