export async function onRequestGet({ env, params }) {
  // Feed settings and credentials must never be served by the public media route.
  if (!/^[\d]+-[\da-f-]+\.(?:jpg|png|webp)$/.test(params.key || "")) return new Response("Not found", { status: 404 });
  const object = await env.EVENT_MEDIA?.get(`instagram/${params.key}`);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers(); object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("x-content-type-options", "nosniff");
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(object.body, { headers });
}
