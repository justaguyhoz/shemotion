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

async function fetchOutreachSnapshot(config, fetchImpl, logger) {
  const request = {
    action: "outreach_snapshot",
    token: config.token,
  };

  try {
    return await callAppsScript(config.url, request, fetchImpl);
  } catch (error) {
    // Google Apps Script can briefly return 404 from an otherwise active web-app
    // deployment. This action is read-only, so one retry is safe and cannot
    // duplicate a contact submission or mutate outreach data.
    if (error?.bridgeCode !== "http_error" || error?.bridgeStatus !== 404) throw error;
    logger.warn("outreach_bridge_retry", { code: "http_error", upstreamStatus: 404 });
    return callAppsScript(config.url, request, fetchImpl);
  }
}

export async function processOutreachRequest({ env }, fetchImpl = fetch, logger = console) {
  try {
    const config = getAppsScriptConfig(env, "OUTREACH_DASHBOARD_TOKEN");
    const payload = await fetchOutreachSnapshot(config, fetchImpl, logger);
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
