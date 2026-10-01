import { jsonResponse } from "../../../shared/events.js";

const MAX_BYTES = 8 * 1024 * 1024;
const TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

function detectedType(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}

export async function onRequestPost({ request, env }) {
  if (!env.EVENT_MEDIA) return jsonResponse({ error: "Event image storage is not configured." }, 503);
  let form;
  try {
    form = await request.formData();
  } catch {
    return jsonResponse({ error: "Upload a JPG, PNG or WebP image." }, 400);
  }
  const file = form.get("image");
  if (!(file instanceof File) || !file.size) return jsonResponse({ error: "Choose an image to upload." }, 400);
  if (file.size > MAX_BYTES) return jsonResponse({ error: "Images must be 8 MB or smaller." }, 413);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = detectedType(bytes);
  if (!type || !TYPES.has(type) || (file.type && file.type !== type)) {
    return jsonResponse({ error: "Only valid JPG, PNG and WebP images are accepted." }, 415);
  }
  const key = `events/${crypto.randomUUID()}.${TYPES.get(type)}`;
  await env.EVENT_MEDIA.put(key, bytes, {
    httpMetadata: { contentType: type, cacheControl: "public, max-age=31536000, immutable" },
    customMetadata: { uploadedBy: "shemotion-admin" },
  });
  return jsonResponse({ ok: true, url: `/media/${key}`, key }, 201);
}

export { detectedType, MAX_BYTES };
