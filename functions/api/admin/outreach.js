import { callAppsScript, getAppsScriptConfig } from "../../../shared/apps-script.js";
import { jsonResponse } from "../../../shared/events.js";
import { sanitizeOutreachSnapshot } from "../../../shared/outreach.js";

const RESPONSE_HEADERS = {
  "cache-control": "no-store, private",
  "x-content-type-options": "nosniff",
};

export async function processOutreachRequest({ env }, fetchImpl = fetch) {
  try {
    const config = getAppsScriptConfig(env, "OUTREACH_DASHBOARD_TOKEN");
    const payload = await callAppsScript(config.url, {
      action: "outreach_snapshot",
      token: config.token,
    }, fetchImpl);
    if (payload.action !== "outreach_snapshot") throw new Error("Unexpected bridge response");
    return jsonResponse(sanitizeOutreachSnapshot(payload), 200, RESPONSE_HEADERS);
  } catch {
    return jsonResponse({ error: "Outreach reporting is temporarily unavailable." }, 502, RESPONSE_HEADERS);
  }
}

export function onRequestGet(context) {
  return processOutreachRequest(context);
}
