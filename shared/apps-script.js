const APPS_SCRIPT_HOSTS = new Set(["script.google.com", "script.googleusercontent.com"]);
const APPS_SCRIPT_ERROR_CODES = new Set([
  "configuration_error",
  "internal_error",
  "invalid_request",
  "method_not_allowed",
  "unauthorized",
  "upstream_error",
]);

function appsScriptError(code, status) {
  const error = new Error("Apps Script bridge request failed");
  error.bridgeCode = code;
  if (Number.isInteger(status)) error.bridgeStatus = status;
  return error;
}

export function getAppsScriptConfig(env, tokenName) {
  const rawUrl = String(env.CONTACT_WEBHOOK_URL || "").trim();
  const token = String(env[tokenName] || "");

  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw appsScriptError("configuration_error");
  }

  if (url.protocol !== "https:" || !APPS_SCRIPT_HOSTS.has(url.hostname) || token.length < 32) {
    throw appsScriptError("configuration_error");
  }

  return { url: url.toString(), token };
}

export async function callAppsScript(url, body, fetchImpl = fetch) {
  let response;
  try {
    response = await fetchImpl(url, {
      method: "POST",
      headers: {
        "content-type": "application/json; charset=utf-8",
        accept: "application/json",
      },
      body: JSON.stringify(body),
      redirect: "follow",
    });
  } catch {
    throw appsScriptError("network_error");
  }

  if (!response.ok) throw appsScriptError("http_error", response.status);

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw appsScriptError("invalid_json");
  }

  if (!payload || payload.ok !== true) {
    const upstreamCode = APPS_SCRIPT_ERROR_CODES.has(payload?.error) ? payload.error : "rejected";
    throw appsScriptError(`apps_script_${upstreamCode}`);
  }
  return payload;
}
