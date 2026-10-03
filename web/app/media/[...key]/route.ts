import { parseRange } from "@/lib/cms/media";
import { bindings } from "@/lib/db";

const KEY = /^(?:[\w-]+\/[\w-]+\.(?:jpg|png|gif|webp)|videos\/[\w-]+\/[\w-]+\.(?:mp4|mov|webm))$/;

// Serves CMS images and uploaded videos from R2. Keys are random UUIDs, so responses are immutable.
// Videos support Range requests (required for seeking and for iOS playback).
export async function GET(request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.join("/");
  if (!KEY.test(key)) return new Response("Not found", { status: 404 });
  const { MEDIA } = await bindings();

  const headers = new Headers({
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
    "Accept-Ranges": "bytes",
  });

  const rangeHeader = request.headers.get("range");
  if (rangeHeader) {
    const head = await MEDIA.head(key);
    if (!head) return new Response("Not found", { status: 404 });
    const range = parseRange(rangeHeader, head.size);
    if (!range) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${head.size}` } });
    const part = await MEDIA.get(key, { range });
    if (!part) return new Response("Not found", { status: 404 });
    headers.set("Content-Type", head.httpMetadata?.contentType ?? "application/octet-stream");
    headers.set("Content-Range", `bytes ${range.offset}-${range.offset + range.length - 1}/${head.size}`);
    headers.set("Content-Length", String(range.length));
    headers.set("ETag", head.httpEtag);
    return new Response((part as R2ObjectBody).body as ReadableStream, { status: 206, headers });
  }

  const object = await MEDIA.get(key);
  if (!object) return new Response("Not found", { status: 404 });
  headers.set("Content-Type", object.httpMetadata?.contentType ?? "application/octet-stream");
  headers.set("Content-Length", String(object.size));
  headers.set("ETag", object.httpEtag);
  return new Response(object.body as ReadableStream, { headers });
}
