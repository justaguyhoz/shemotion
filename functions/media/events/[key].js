export async function onRequestGet({ env, params }) {
  if (!env.EVENT_MEDIA) return new Response("Not found", { status: 404 });
  const object = await env.EVENT_MEDIA.get(`events/${params.key}`);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("x-content-type-options", "nosniff");
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(object.body, { headers });
}
