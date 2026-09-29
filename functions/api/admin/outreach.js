import { callAppsScript, getAppsScriptConfig } from "../../../shared/apps-script.js";
import { jsonResponse } from "../../../shared/events.js";
import { sanitizeOutreachSnapshot } from "../../../shared/outreach.js";

const RESPONSE_HEADERS = {
  "cache-control": "no-store, private",
  "x-content-type-options": "nosniff",
};

function safeFailureDetails(error) {
  if (typeof error?.bridgeCode === "string") {
    const details = { code: error.bridgeCode };
    if (Number.isInteger(error.bridgeStatus)) details.upstreamStatus = error.bridgeStatus;
    return details;
  }
  if (error?.message === "Unexpected bridge response") return { code: "action_mismatch" };
  if (error?.message === "Invalid outreach response") return { code: "snapshot_invalid" };
  return { code: "unexpected_error" };
}

export async function processOutreachRequest({ env }, fetchImpl = fetch, logger = console) {
  try {
    const config = getAppsScriptConfig(env, "OUTREACH_DASHBOARD_TOKEN");
    const payload = await callAppsScript(config.url, {
      action: "outreach_snapshot",
      token: config.token,
    }, fetchImpl);
    if (payload.action !== "outreach_snapshot") throw new Error("Unexpected bridge response");
    return jsonResponse(sanitizeOutreachSnapshot(payload), 200, RESPONSE_HEADERS);
  } catch (error) {
    logger.error("outreach_bridge_failure", safeFailureDetails(error));
    return jsonResponse({ error: "Outreach reporting is temporarily unavailable." }, 502, RESPONSE_HEADERS);
  }
}

export function onRequestGet(context) {
  return processOutreachRequest(context);
}
