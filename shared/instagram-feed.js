import { FEATURED_INSTAGRAM_POSTS } from "./instagram-gallery.js";

const FEED = "instagram/feed.json";
const SETTINGS = "instagram/settings.json";
const LOCK = "instagram/sync-lock.json";
const DAY = 86400000;
const MAX_IMAGE = 5 * 1024 * 1024;
const jsonMetadata = { httpMetadata: { contentType: "application/json" } };

export function instagramConnected(env) {
  return Boolean(env.INSTAGRAM_ACCESS_TOKEN);
}

async function readJson(bucket, key) {
  const object = await bucket?.get(key);
  return object ? object.json() : null;
}

export async function instagramState(env) {
  const [feed, settings] = await Promise.all([
    readJson(env.EVENT_MEDIA, FEED), readJson(env.EVENT_MEDIA, SETTINGS),
  ]);
  return {
    connected: instagramConnected(env), storageAvailable: Boolean(env.EVENT_MEDIA),
    automatic: settings?.automatic === true,
    lastAttemptAt: settings?.lastAttemptAt || null,
    lastError: settings?.lastError || null,
    updatedAt: feed?.updatedAt || "2026-10-23T00:00:00.000Z",
    source: feed?.source || "Public @shemotion.au profile snapshot",
    posts: feed?.posts?.length ? feed.posts : FEATURED_INSTAGRAM_POSTS,
  };
}

export function validateInstagramPosts(posts) {
  if (!Array.isArray(posts) || posts.length < 1 || posts.length > 12) throw new Error("Use between 1 and 12 Instagram posts.");
  return posts.map((post) => {
    const url = new URL(post.url);
    if (url.protocol !== "https:" || !["www.instagram.com", "instagram.com"].includes(url.hostname) || url.username || url.password || !/^\/(?:[\w.]+\/)?(?:p|reel)\/[\w-]+\/?$/.test(url.pathname)) {
      throw new Error("Each post needs a valid Instagram post or reel link.");
    }
    if (!/^\/(?:assets\/instagram|media\/(?:features|instagram))\/[\w-]+\.(?:jpg|jpeg|png|webp)$/.test(String(post.imageUrl))) {
      throw new Error("Upload a thumbnail or keep an existing gallery image.");
    }
    return { url: `${url.origin}${url.pathname}`, title: String(post.title || "Shemotion on Instagram").slice(0, 220), imageUrl: post.imageUrl };
  });
}

export async function saveInstagramSettings(env, input) {
  if (!env.EVENT_MEDIA) throw new Error("Image storage is not configured.");
  if (input.automatic !== undefined) {
    if (typeof input.automatic !== "boolean") throw new Error("Automatic refresh must be on or off.");
    if (input.automatic && !instagramConnected(env)) throw new Error("Connect the official Instagram API before enabling automatic refresh.");
  }
  // Validate all fields before changing either stored document.
  const posts = input.posts === undefined ? null : validateInstagramPosts(input.posts);
  if (posts) await env.EVENT_MEDIA.put(FEED, JSON.stringify({ posts, updatedAt: new Date().toISOString(), source: "Admin-managed Instagram posts" }), jsonMetadata);
  if (input.automatic !== undefined) {
    const settings = await readJson(env.EVENT_MEDIA, SETTINGS) || {};
    await env.EVENT_MEDIA.put(SETTINGS, JSON.stringify({ ...settings, automatic: input.automatic }), jsonMetadata);
  }
  return instagramState(env);
}

async function instagramJson(env, resource, fetcher) {
  const version = /^v\d+\.\d+$/.test(env.INSTAGRAM_API_VERSION || "") ? env.INSTAGRAM_API_VERSION : "v24.0";
  const response = await fetcher(`https://graph.instagram.com/${version}/${resource}`, {
    headers: { Authorization: `Bearer ${env.INSTAGRAM_ACCESS_TOKEN}` },
    signal: AbortSignal.timeout(15000), redirect: "error",
  });
  if (!response.ok) throw new Error("Instagram could not refresh the feed. Check the account connection and token permissions.");
  return response.json();
}

export async function downloadInstagramCover(url, fetcher) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.port || !["cdninstagram.com", "fbcdn.net"].some((host) => parsed.hostname.endsWith(`.${host}`))) {
    throw new Error("Instagram returned an unsupported image source.");
  }
  const response = await fetcher(url, { signal: AbortSignal.timeout(15000), redirect: "error" });
  if (!response.ok || Number(response.headers.get("content-length")) > MAX_IMAGE) throw new Error("An Instagram cover could not be downloaded.");
  const reader = response.body.getReader();
  const chunks = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_IMAGE) { await reader.cancel(); throw new Error("An Instagram cover is too large."); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let type, extension;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) { type = "image/jpeg"; extension = "jpg"; }
  else if ([137,80,78,71,13,10,26,10].every((value, index) => bytes[index] === value)) { type = "image/png"; extension = "png"; }
  else if (new TextDecoder().decode(bytes.slice(0,4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8,12)) === "WEBP") { type = "image/webp"; extension = "webp"; }
  else throw new Error("Instagram returned an invalid cover image.");
  return { bytes, type, extension };
}

export async function refreshInstagram(env, fetcher = fetch) {
  if (!instagramConnected(env) || !env.EVENT_MEDIA) throw new Error("Connect the official Instagram API to enable refresh. Manual gallery updates are available below.");
  const bucket = env.EVENT_MEDIA;
  const oldLock = await bucket.get(LOCK);
  if (oldLock && (await oldLock.json()).until > Date.now()) throw new Error("An Instagram refresh is already running.");
  const lease = await bucket.put(LOCK, JSON.stringify({ until: Date.now() + 300000 }), {
    ...jsonMetadata, onlyIf: oldLock ? { etagMatches: oldLock.etag } : { etagDoesNotMatch: "*" },
  });
  if (!lease) throw new Error("An Instagram refresh is already running.");
  const settings = await readJson(bucket, SETTINGS) || {};
  try {
    const owner = await instagramJson(env, "me?fields=id,username", fetcher);
    if (String(owner.username).toLowerCase() !== "shemotion.au") throw new Error("Connect the @shemotion.au Instagram account.");
    const result = await instagramJson(env, "me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&limit=9", fetcher);
    if (!Array.isArray(result.data) || !result.data.length) throw new Error("Instagram returned no posts. The previous gallery has been kept.");
    const posts = [];
    for (const item of result.data.slice(0,9)) {
      if (!/^\d+$/.test(String(item.id))) throw new Error("Instagram returned an invalid post.");
      const image = await downloadInstagramCover(item.media_type === "VIDEO" ? item.thumbnail_url : item.media_url, fetcher);
      const key = `instagram/${item.id}-${crypto.randomUUID()}.${image.extension}`;
      await bucket.put(key, image.bytes, { httpMetadata: { contentType: image.type, cacheControl: "public, max-age=31536000, immutable" } });
      posts.push({ url: item.permalink, title: String(item.caption || "Shemotion on Instagram").slice(0,220), imageUrl: `/media/${key}` });
    }
    // Publish only once every cover and post has been validated successfully.
    await bucket.put(FEED, JSON.stringify({ posts: validateInstagramPosts(posts), updatedAt: new Date().toISOString(), source: "Official Instagram API — @shemotion.au" }), jsonMetadata);
    await bucket.put(SETTINGS, JSON.stringify({ ...settings, lastAttemptAt: new Date().toISOString(), lastError: null }), jsonMetadata);
  } catch (error) {
    // Do not expose upstream responses, signed CDN URLs or access tokens.
    const message = /^(Instagram|Connect|An Instagram)/.test(error.message) ? error.message : "Instagram refresh failed. The previous gallery has been kept.";
    await bucket.put(SETTINGS, JSON.stringify({ ...settings, lastAttemptAt: new Date().toISOString(), lastError: message }), jsonMetadata);
    throw new Error(message);
  } finally {
    await bucket.delete(LOCK);
  }
  return instagramState(env);
}

export function instagramRefreshDue(state, now = Date.now()) {
  const last = Math.max(Date.parse(state.updatedAt) || 0, Date.parse(state.lastAttemptAt) || 0);
  return state.connected && state.automatic && now - last >= DAY;
}
