import { jsonResponse } from "./events.js";

function decodeBase64Url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
  return bytes;
}

function parseJsonPart(value) {
  return JSON.parse(new TextDecoder().decode(decodeBase64Url(value)));
}

function normaliseDomain(value) {
  return String(value || "").trim().replace(/\/$/, "");
}

export async function verifyAccessRequest(context) {
  const domain = normaliseDomain(context.env.ACCESS_TEAM_DOMAIN);
  const audience = String(context.env.ACCESS_AUD || "").trim();
  const allowedEmails = String(context.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (!domain || !audience || !allowedEmails.length) {
    return { response: jsonResponse({ error: "Admin access is not configured." }, 503) };
  }

  const token = context.request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) return { response: jsonResponse({ error: "Authentication required." }, 401) };

  try {
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("Invalid token");

    const header = parseJsonPart(parts[0]);
    const payload = parseJsonPart(parts[1]);
    if (header.alg !== "RS256" || !header.kid) throw new Error("Invalid token header");

    const certResponse = await fetch(`${domain}/cdn-cgi/access/certs`, {
      cf: { cacheTtl: 300, cacheEverything: true },
    });
    if (!certResponse.ok) throw new Error("Unable to load signing keys");
    const certs = await certResponse.json();
    const jwk = certs.keys?.find((key) => key.kid === header.kid);
    if (!jwk) throw new Error("Unknown signing key");

    const key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const signedData = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const signatureValid = await crypto.subtle.verify(
      { name: "RSASSA-PKCS1-v1_5" },
      key,
      decodeBase64Url(parts[2]),
      signedData
    );

    const now = Math.floor(Date.now() / 1000);
    const tokenAudience = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    const issuerValid = normaliseDomain(payload.iss) === domain;
    const email = String(payload.email || "").toLowerCase();

    if (!signatureValid || !issuerValid || !tokenAudience.includes(audience) || payload.exp <= now || (payload.nbf && payload.nbf > now)) {
      throw new Error("Token verification failed");
    }
    if (!allowedEmails.includes(email)) {
      return { response: jsonResponse({ error: "You do not have access to this admin." }, 403) };
    }

    return { payload, email };
  } catch {
    return { response: jsonResponse({ error: "Authentication failed." }, 401) };
  }
}

export async function accessMiddleware(context) {
  const result = await verifyAccessRequest(context);
  if (result.response) return result.response;
  context.data.adminEmail = result.email;
  return context.next();
}
