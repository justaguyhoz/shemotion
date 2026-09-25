import { callAppsScript, getAppsScriptConfig } from "../../shared/apps-script.js";
import { validateContactInput } from "../../shared/contact.js";
import {
  attributionForRequest,
  claimContactNotification,
  markContactNotification,
  storeContactSubmission,
} from "../../shared/contacts.js";
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

  const attribution = attributionForRequest(request, payload);
  let stored;
  try {
    stored = await storeContactSubmission(env.DB, payload, attribution);
  } catch {
    return jsonResponse({ ok: false, error: "Your enquiry could not be saved. Please try again." }, 503, RESPONSE_HEADERS);
  }

  let notificationAction;
  try {
    notificationAction = await claimContactNotification(env.DB, stored.submissionId);
  } catch {
    return jsonResponse({ ok: false, error: "Your enquiry was saved, but the notification could not be prepared." }, 503, RESPONSE_HEADERS);
  }

  if (notificationAction === "sent" || notificationAction === "processing") {
    return jsonResponse({ ok: true }, 200, RESPONSE_HEADERS);
  }

  try {
    const config = getAppsScriptConfig(env, "CONTACT_WEBHOOK_TOKEN");
    const result = await callAppsScript(config.url, {
      action: "contact_submit",
      token: config.token,
      payload: {
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        interestCategory: payload.interestCategory,
        message: payload.message,
        websiteSource: attribution.sourceUrl,
      },
    }, fetchImpl);
    if (result.action !== "contact_submit") throw new Error("Unexpected bridge response");
  } catch {
    try {
      await markContactNotification(env.DB, stored.submissionId, "failed");
    } catch {
      // The enquiry remains stored even if notification-state recording fails.
    }
    return jsonResponse({ ok: false, error: "Your enquiry could not be sent. Please try again." }, 502, RESPONSE_HEADERS);
  }

  try {
    await markContactNotification(env.DB, stored.submissionId, "sent");
  } catch {
    // The email was delivered, so do not return a failure that may cause a duplicate notification.
  }
  return jsonResponse({ ok: true }, 200, RESPONSE_HEADERS);
}

export function onRequestPost(context) {
  return processContactRequest(context);
}
