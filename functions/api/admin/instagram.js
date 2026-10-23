import { jsonResponse } from "../../../shared/events.js";
import { instagramState, refreshInstagram, saveInstagramSettings } from "../../../shared/instagram-feed.js";

export async function onRequestGet({ env }) {
  try { return jsonResponse(await instagramState(env)); }
  catch { return jsonResponse({ error: "The Instagram gallery could not be loaded." }, 503); }
}

async function update({ request, env }, refresh) {
  if (request.headers.get("origin") && request.headers.get("origin") !== new URL(request.url).origin) return jsonResponse({ error: "Invalid request origin." }, 403);
  if (!request.headers.get("content-type")?.includes("application/json")) return jsonResponse({ error: "A JSON request is required." }, 415);
  let input;
  try {
    const text = await request.text();
    if (text.length > 32768) return jsonResponse({ error: "The gallery settings are too large." }, 413);
    input = JSON.parse(text);
  } catch { return jsonResponse({ error: "Invalid JSON." }, 400); }
  if (!input || typeof input !== "object" || Array.isArray(input)) return jsonResponse({ error: "Invalid settings." }, 400);
  try { return jsonResponse(await (refresh ? refreshInstagram(env) : saveInstagramSettings(env, input))); }
  catch (error) {
    const safeValidation = /^(Use between|Each post|Upload a thumbnail|Automatic refresh|Connect the official|Image storage)/.test(error.message);
    return jsonResponse({ error: refresh ? "The refresh could not complete. Check the connection status and try again; the previous gallery has been kept." : safeValidation ? error.message : "The gallery settings could not be saved. Check the post links and covers and try again." }, 400);
  }
}
export const onRequestPost = (context) => update(context, true);
export const onRequestPut = (context) => update(context, false);
