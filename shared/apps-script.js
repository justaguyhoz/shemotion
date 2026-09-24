const APPS_SCRIPT_HOSTS = new Set(["script.google.com", "script.googleusercontent.com"]);

export function getAppsScriptConfig(env, tokenName) {
  const rawUrl = String(env.CONTACT_WEBHOOK_URL || "").trim();
  const token = String(env[tokenName] || "");

  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Apps Script bridge is not configured");
  }

  if (url.protocol !== "https:" || !APPS_SCRIPT_HOSTS.has(url.hostname) || token.length < 32) {
    throw new Error("Apps Script bridge is not configured");
  }

  return { url: url.toString(), token };
}

export async function callAppsScript(url, body, fetchImpl = fetch) {
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      "content-type": "application/json; charset=utf-8",
      accept: "application/json",
    },
    body: JSON.stringify(body),
    redirect: "follow",
  });

  if (!response.ok) throw new Error("Apps Script request failed");

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error("Apps Script returned an invalid response");
  }

  if (!payload || payload.ok !== true) throw new Error("Apps Script rejected the request");
  return payload;
}
