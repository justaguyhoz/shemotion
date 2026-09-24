import { callAppsScript, getAppsScriptConfig } from "../../shared/apps-script.js";
import { validateContactInput } from "../../shared/contact.js";
import { jsonResponse } from "../../shared/events.js";

const RESPONSE_HEADERS = {
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
};

function requestOriginAllowed(request) {
  const requestUrl = new URL(request.url);
  const origin = request.headers.get("origin");
  if (!origin) return false;
  if (origin === requestUrl.origin) return true;
  return origin === "https://shemotion.com.au" || origin === "https://www.shemotion.com.au";
}

function websiteSource(request) {
  const requestUrl = new URL(request.url);
  const referrer = request.headers.get("referer");
  if (!referrer) return requestUrl.origin;
  try {
    const url = new URL(referrer);
    return url.origin === requestUrl.origin ? `${url.origin}${url.pathname}`.slice(0, 500) : requestUrl.origin;
  } catch {
    return requestUrl.origin;
  }
}

export async function processContactRequest({ request, env }, fetchImpl = fetch) {
  if (!requestOriginAllowed(request)) {
    return jsonResponse({ ok: false, error: "Request not accepted." }, 403, RESPONSE_HEADERS);
  }

  const contentType = request.headers.get("content-type") || "";
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (!contentType.toLowerCase().startsWith("application/json") || contentLength > 20000) {
    return jsonResponse({ ok: false, error: "Please check the form details." }, 400, RESPONSE_HEADERS);
  }

  let input;
  try {
    const rawBody = await request.text();
    if (!rawBody || rawBody.length > 20000) throw new Error("Invalid request size");
    input = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ ok: false, error: "Please check the form details." }, 400, RESPONSE_HEADERS);
  }

  let payload;
  try {
    payload = validateContactInput(input);
  } catch {
    return jsonResponse({ ok: false, error: "Please check the form details." }, 400, RESPONSE_HEADERS);
  }

  try {
    const config = getAppsScriptConfig(env, "CONTACT_WEBHOOK_TOKEN");
    const result = await callAppsScript(config.url, {
      action: "contact_submit",
      token: config.token,
      payload: { ...payload, websiteSource: websiteSource(request) },
    }, fetchImpl);
    if (result.action !== "contact_submit") throw new Error("Unexpected bridge response");
    return jsonResponse({ ok: true }, 200, RESPONSE_HEADERS);
  } catch {
    return jsonResponse({ ok: false, error: "Your enquiry could not be sent. Please try again." }, 502, RESPONSE_HEADERS);
  }
}

export function onRequestPost(context) {
  return processContactRequest(context);
}
