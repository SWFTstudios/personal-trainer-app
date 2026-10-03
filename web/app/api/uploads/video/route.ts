import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/auth/session";
import { MAX_VIDEO_BYTES, sniffVideo, VIDEO_CHUNK_BYTES } from "@/lib/cms/media";
import { bindings, first, isDbError, newId, run } from "@/lib/db";
import { notify } from "@/lib/notify";
import { setVideoCollections } from "@/lib/videos-admin";

// Chunked video upload straight into R2 (multipart), so large files work within Worker request limits.
//   POST ?action=create   {filename, size}               -> {key, uploadId, chunkSize}
//   PUT  ?action=part&key&uploadId&part=N  <bytes>       -> {partNumber, etag}
//   POST ?action=complete {key, uploadId, parts, ...meta}-> {id}
//   POST ?action=abort    {key, uploadId}

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });

async function currentTrainer() {
  const user = await getUser();
  if (!user) return null;
  return first<{ id: string; slug: string | null; display_name: string | null; logo_url: string | null }>(
    "SELECT id, slug, display_name, logo_url FROM trainers WHERE user_id = ?",
    user.id,
  );
}

const Meta = z.object({
  key: z.string(),
  uploadId: z.string().min(1),
  parts: z.array(z.object({ partNumber: z.number().int().min(1).max(10_000), etag: z.string().min(1) })).min(1),
  title: z.string().trim().min(1).max(160),
  category: z.string().trim().max(40).default(""),
  description: z.string().trim().max(2000).default(""),
  collections: z.array(z.string()).max(50).default([]),
  visibility: z.enum(["members", "public"]).default("members"),
  thumbnail_url: z.string().regex(/^\/media\/[\w./-]+$/).nullable().optional(),
  notify: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  const trainer = await currentTrainer();
  if (!trainer) return json({ error: "Sign in again." }, 401);
  const action = request.nextUrl.searchParams.get("action");
  const { MEDIA } = await bindings();
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return json({ error: "Bad request" }, 400);
  const ownsKey = (key: unknown): key is string => typeof key === "string" && new RegExp(`^videos/${trainer.id}/[\\w-]+\\.(mp4|mov|webm)$`).test(key);

  if (action === "create") {
    const size = Number(body.size);
    if (!Number.isFinite(size) || size <= 0) return json({ error: "Empty file." }, 400);
    if (size > MAX_VIDEO_BYTES) return json({ error: "Videos must be 2 GB or smaller." }, 413);
    const name = String(body.filename ?? "").toLowerCase();
    const ext = name.endsWith(".webm") ? "webm" : name.endsWith(".mov") ? "mov" : "mp4";
    const type = ext === "webm" ? "video/webm" : ext === "mov" ? "video/quicktime" : "video/mp4";
    const key = `videos/${trainer.id}/${newId()}.${ext}`;
    const upload = await MEDIA.createMultipartUpload(key, { httpMetadata: { contentType: type } });
    return json({ key, uploadId: upload.uploadId, chunkSize: VIDEO_CHUNK_BYTES });
  }

  if (action === "abort") {
    if (!ownsKey(body.key) || typeof body.uploadId !== "string") return json({ error: "Bad request" }, 400);
    await MEDIA.resumeMultipartUpload(body.key, body.uploadId).abort().catch(() => undefined);
    return json({ ok: true });
  }

  if (action === "complete") {
    const parsed = Meta.safeParse(body);
    if (!parsed.success || !ownsKey(parsed.data.key)) return json({ error: "Missing video details." }, 400);
    const m = parsed.data;
    const object = await MEDIA.resumeMultipartUpload(m.key, m.uploadId).complete(m.parts.sort((a, b) => a.partNumber - b.partNumber));
    const id = newId();
    try {
      await run(
        `INSERT INTO videos (id, trainer_id, provider, provider_id, url, title, description, category, thumbnail_url, visibility, size_bytes)
         VALUES (?, ?, 'upload', ?, ?, ?, ?, ?, ?, ?, ?)`,
        id, trainer.id, m.key, `/media/${m.key}`, m.title, m.description || null, m.category || null, m.thumbnail_url ?? null, m.visibility, object.size,
      );
    } catch (e) {
      if (isDbError(e, "UNIQUE constraint failed")) return json({ error: "Already uploaded." }, 409);
      throw e;
    }
    await setVideoCollections(trainer.id, id, m.collections);
    if (m.notify && trainer.slug) {
      await notify({
        trainerId: trainer.id, kind: "video", title: `New video: ${m.title}`, body: m.category || null,
        url: `/${trainer.slug}/app/videos/${id}`, icon: trainer.logo_url ?? `/${trainer.slug}/icon`,
      });
    }
    return json({ id });
  }

  return json({ error: "Unknown action" }, 400);
}

export async function PUT(request: NextRequest) {
  const trainer = await currentTrainer();
  if (!trainer) return json({ error: "Sign in again." }, 401);
  const q = request.nextUrl.searchParams;
  const key = q.get("key") ?? "";
  const uploadId = q.get("uploadId") ?? "";
  const part = Number(q.get("part"));
  if (!new RegExp(`^videos/${trainer.id}/[\\w-]+\\.(mp4|mov|webm)$`).test(key) || !uploadId || !Number.isInteger(part) || part < 1 || part > 10_000) {
    return json({ error: "Bad request" }, 400);
  }
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.length === 0 || bytes.length > VIDEO_CHUNK_BYTES) return json({ error: "Bad chunk size" }, 400);
  if (part === 1 && !sniffVideo(bytes)) return json({ error: "That file isn't an MP4, MOV or WebM video." }, 415);

  const { MEDIA } = await bindings();
  const uploaded = await MEDIA.resumeMultipartUpload(key, uploadId).uploadPart(part, bytes);
  return json({ partNumber: uploaded.partNumber, etag: uploaded.etag });
}
