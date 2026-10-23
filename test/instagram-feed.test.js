import test from "node:test";
import assert from "node:assert/strict";
import { instagramState, instagramRefreshDue, validateInstagramPosts, saveInstagramSettings, refreshInstagram, downloadInstagramCover } from "../shared/instagram-feed.js";
import { onRequestGet, onRequestPut, onRequestPost } from "../functions/api/admin/instagram.js";
import { onRequestGet as mediaGet } from "../functions/media/instagram/[key].js";
import { onRequestGet as homepage } from "../functions/index.js";
import { injectInstagramGallery } from "../shared/instagram-gallery.js";

class Bucket {
  records = new Map(); sequence = 0;
  async get(key) {
    const item = this.records.get(key);
    return item ? { ...item, json: async () => JSON.parse(item.value), body: item.value, httpEtag: item.etag, writeHttpMetadata(headers) { headers.set("content-type", item.options?.httpMetadata?.contentType || "application/json"); } } : null;
  }
  async put(key, value, options = {}) {
    const old = this.records.get(key);
    if (options.onlyIf?.etagDoesNotMatch === "*" && old) return null;
    if (options.onlyIf?.etagMatches && old?.etag !== options.onlyIf.etagMatches) return null;
    const etag = String(++this.sequence);
    this.records.set(key, { value, options, etag }); return { etag };
  }
  async delete(key) { this.records.delete(key); }
}
const post = { title: "Real post", url: "https://www.instagram.com/shemotion.au/reel/Abc123/", imageUrl: "/assets/instagram/Des0wNwM47h.webp" };
const apiRequest = (method, input, origin = "https://shemotion.com.au") => new Request("https://shemotion.com.au/api/admin/instagram", { method, headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify(input) });
function upstream({ wrongOwner = false, brokenCover = false, empty = false } = {}) {
  return async (url, options) => {
    if (url.includes("graph.instagram.com")) {
      assert.equal(options.headers.Authorization, "Bearer secret-test-token");
      assert.equal(url.includes("secret-test-token"), false);
      if (url.includes("me?")) return Response.json({ id: "123", username: wrongOwner ? "other_account" : "shemotion.au" });
      return Response.json({ data: empty ? [] : [{ id: "12345", caption: "A real account caption", media_type: "VIDEO", thumbnail_url: "https://scontent.cdninstagram.com/cover.jpg", permalink: post.url }] });
    }
    return new Response(brokenCover ? "not an image" : new Uint8Array([255,216,255,224,0,0]), { headers: { "Content-Type": "image/jpeg" } });
  };
}

test("unconfigured Instagram keeps the nine real bundled posts and never implies a connection", async () => {
  const state = await instagramState({});
  assert.equal(state.connected, false); assert.equal(state.automatic, false); assert.equal(state.posts.length, 9);
  assert.equal(instagramRefreshDue(state, Date.now()+86400000*10), false);
  const response = await onRequestGet({ env: {} }); assert.equal(response.status, 200);
});

test("admin can save real post links and stored thumbnails without an Instagram token", async () => {
  const env = { EVENT_MEDIA: new Bucket() };
  const result = await onRequestPut({ env, request: apiRequest("PUT", { posts: [post] }) });
  assert.equal(result.status, 200); assert.deepEqual((await instagramState(env)).posts, [post]);
  assert.equal((await onRequestPut({ env, request: apiRequest("PUT", { automatic: true }) })).status, 400);
  assert.equal((await onRequestPut({ env, request: apiRequest("PUT", { posts: [post] }, "https://evil.example") })).status, 403);
});

test("Instagram rejects unsafe post URLs, remote thumbnails and oversized galleries", () => {
  for (const bad of [{ ...post, url: "javascript:alert(1)" }, { ...post, url: "https://instagram.com.evil.test/p/abc/" }, { ...post, url: "https://u:p@www.instagram.com/p/abc/" }, { ...post, imageUrl: "https://evil.test/track.jpg" }, { ...post, imageUrl: "/media/instagram/../settings.json" }]) assert.throws(() => validateInstagramPosts([bad]));
  assert.throws(() => validateInstagramPosts([])); assert.throws(() => validateInstagramPosts(Array(13).fill(post)));
});

test("official sync verifies the account and stores video thumbnails before replacing the feed", async () => {
  const env = { EVENT_MEDIA: new Bucket(), INSTAGRAM_ACCESS_TOKEN: "secret-test-token" };
  const state = await refreshInstagram(env, upstream());
  assert.equal(state.posts.length, 1); assert.match(state.posts[0].imageUrl, /^\/media\/instagram\/12345-/);
  assert.equal(state.posts[0].url, post.url); assert.equal(state.lastError, null);
  assert.equal(JSON.stringify(state).includes("secret-test-token"), false);
  assert.equal(env.EVENT_MEDIA.records.has("instagram/sync-lock.json"), false);
  const image = await mediaGet({ env, params: { key: state.posts[0].imageUrl.split("/").at(-1) } });
  assert.equal(image.status, 200); assert.equal(image.headers.get("content-type"), "image/jpeg");
});

test("failed sync, wrong account and empty results preserve the last gallery and release locks", async () => {
  for (const failure of [{ wrongOwner: true }, { brokenCover: true }, { empty: true }]) {
    const env = { EVENT_MEDIA: new Bucket(), INSTAGRAM_ACCESS_TOKEN: "secret-test-token" };
    await saveInstagramSettings(env, { posts: [post], automatic: true });
    await assert.rejects(refreshInstagram(env, upstream(failure)));
    const state = await instagramState(env);
    assert.deepEqual(state.posts, [post]); assert.ok(state.lastError);
    assert.equal(state.automatic, true); assert.equal(env.EVENT_MEDIA.records.has("instagram/sync-lock.json"), false);
    assert.equal(instagramRefreshDue(state), false);
  }
});

test("automatic refresh is daily, opt-in and protected against overlapping sync", async () => {
  const state = { connected: true, automatic: true, updatedAt: "2026-10-22T00:00:00Z", lastAttemptAt: null };
  assert.equal(instagramRefreshDue(state, Date.parse("2026-10-22T23:59:00Z")), false);
  assert.equal(instagramRefreshDue(state, Date.parse("2026-10-23T00:00:00Z")), true);
  assert.equal(instagramRefreshDue({ ...state, automatic: false }, Date.parse("2026-10-24")), false);
  const env = { EVENT_MEDIA: new Bucket(), INSTAGRAM_ACCESS_TOKEN: "secret-test-token" };
  await env.EVENT_MEDIA.put("instagram/sync-lock.json", JSON.stringify({ until: Date.now()+30000 }));
  await assert.rejects(refreshInstagram(env, upstream()), /already running/);
});

test("public image route cannot reveal stored Instagram settings and cover fetches cannot reach arbitrary hosts", async () => {
  for (const key of ["settings.json", "feed.json", "sync-lock.json", "../settings.json"]) assert.equal((await mediaGet({ env: { EVENT_MEDIA: new Bucket() }, params: { key } })).status, 404);
  for (const url of ["http://scontent.cdninstagram.com/x", "https://evil.test/x", "https://cdninstagram.com.evil.test/x", "https://127.0.0.1/x"]) await assert.rejects(downloadInstagramCover(url, () => { throw new Error("Must not fetch"); }), /unsupported image source/);
});

test("homepage uses saved thumbnails and survives missing Instagram storage", async () => {
  const env = { EVENT_MEDIA: new Bucket(), ASSETS: { fetch: async () => new Response(injectInstagramGallery("<main><!-- INSTAGRAM_GALLERY_CARDS --></main>"), { headers: { "content-type": "text/html" } }) } };
  await saveInstagramSettings(env, { posts: [{ ...post, title: "Saved gallery caption" }] });
  const response = await homepage({ env, request: new Request("https://shemotion.com.au/") });
  assert.match(await response.text(), /Saved gallery caption/);
  env.EVENT_MEDIA.get = async () => { throw new Error("Storage unavailable"); };
  const fallback = await homepage({ env, request: new Request("https://shemotion.com.au/") });
  assert.equal(fallback.status, 200); assert.match(await fallback.text(), /Des0wNwM47h/);
});

test("manual refresh clearly fails when the account is not connected without changing the feed", async () => {
  const env = { EVENT_MEDIA: new Bucket() };
  const response = await onRequestPost({ env, request: apiRequest("POST", {}) });
  assert.equal(response.status, 400); assert.equal((await instagramState(env)).posts.length, 9);
});

test("an opted-in stale homepage queues refresh in the background while serving the saved gallery", async (t) => {
  const env = { EVENT_MEDIA: new Bucket(), INSTAGRAM_ACCESS_TOKEN: "secret-test-token", ASSETS: { fetch: async () => new Response(injectInstagramGallery("<!-- INSTAGRAM_GALLERY_CARDS -->"), { headers: { "content-type": "text/html" } }) } };
  await saveInstagramSettings(env, { posts: [post], automatic: true });
  await env.EVENT_MEDIA.put("instagram/feed.json", JSON.stringify({ posts: [post], updatedAt: "2020-01-01T00:00:00Z" }));
  t.mock.method(globalThis, "fetch", upstream());
  const pending = [];
  const response = await homepage({ env, request: new Request("https://shemotion.com.au/"), waitUntil: (promise) => pending.push(promise) });
  assert.equal(response.status, 200); assert.match(await response.text(), /Real post/);
  assert.equal(pending.length, 1); await Promise.all(pending);
  assert.match((await instagramState(env)).posts[0].imageUrl, /\/media\/instagram\/12345-/);
});
