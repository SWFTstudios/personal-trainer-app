import { bindings } from "@/lib/db";

// Serves CMS uploads from R2. Keys are random UUIDs, so responses are immutable.
export async function GET(_request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.join("/");
  if (!/^[\w-]+\/[\w-]+\.(jpg|png|gif|webp)$/.test(key)) return new Response("Not found", { status: 404 });

  const object = await (await bindings()).MEDIA.get(key);
  if (!object) return new Response("Not found", { status: 404 });

  return new Response(object.body as ReadableStream, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      ETag: object.httpEtag,
    },
  });
}
