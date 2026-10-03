"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { bindings, db, first, isDbError, newId, nowIso, run } from "@/lib/db";
import { listSourceVideos, resolveSource } from "@/lib/sync/sources";
import { importVideos } from "@/lib/sync/run";
import { setVideoCollections } from "@/lib/videos-admin";
import { notify } from "@/lib/notify";
import { LIVE_LABELS, platformOf, safeHttpsUrl } from "@/lib/social";
import { requireTrainer } from "@/lib/trainer";
import type { LivePlatform, Trainer, VideoSource } from "@/lib/types";
import { defaultThumbnail, fallbackTitle, lookupVideo, parseVideoUrl } from "@/lib/video";

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

const appUrl = (t: Trainer, path = "") => `/${t.slug}/app${path}`;
const iconFor = (t: Trainer) => t.logo_url ?? `/${t.slug}/icon`;

// ---------------------------------------------------------------------------
// Video library
// ---------------------------------------------------------------------------

const ids = (formData: FormData, name: string) => formData.getAll(name).map(String).filter(Boolean);

async function insertLinked(trainer: Trainer, rawUrl: string, opts: { title?: string; category?: string | null; collections?: string[]; visibility?: "members" | "public" }) {
  const parsed = parseVideoUrl(rawUrl);
  if (!parsed) return { error: "unsupported" as const };
  const meta = await lookupVideo(parsed);
  const id = newId();
  const title = opts.title || meta.title || fallbackTitle(parsed.provider);
  try {
    await run(
      `INSERT INTO videos (id, trainer_id, provider, provider_id, url, title, category, thumbnail_url, visibility)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id, trainer.id, parsed.provider, parsed.id, parsed.url, title, opts.category ?? null,
      meta.thumbnail_url ?? defaultThumbnail(parsed.provider, parsed.id), opts.visibility ?? "members",
    );
  } catch (e) {
    if (isDbError(e, "UNIQUE constraint failed")) return { error: "duplicate" as const };
    throw e;
  }
  if (opts.collections?.length) await setVideoCollections(trainer.id, id, opts.collections);
  return { id, title };
}

export async function addVideo(formData: FormData) {
  const trainer = await requireTrainer();
  const result = await insertLinked(trainer, String(formData.get("url") ?? ""), {
    title: String(formData.get("title") ?? "").trim().slice(0, 160),
    category: String(formData.get("category") ?? "").trim().slice(0, 40) || null,
    collections: ids(formData, "collections"),
    visibility: formData.get("visibility") === "public" ? "public" : "members",
  });
  if ("error" in result) {
    fail("/dashboard/videos/add", result.error === "duplicate" ? "That video is already in your library." : "Paste a YouTube, Vimeo, TikTok, Instagram, Loom or .mp4 link.");
  }
  if (formData.get("notify") === "on" && trainer.slug) {
    await notify({ trainerId: trainer.id, kind: "video", title: `New video: ${result.title}`, url: appUrl(trainer, `/videos/${result.id}`), icon: iconFor(trainer) });
  }
  revalidatePath("/", "layout");
  redirect(`/dashboard/videos/${result.id}?added=1`);
}

/** Paste many share links (TikTok, Instagram, YouTube, …) at once. */
export async function addVideoLinks(formData: FormData) {
  const trainer = await requireTrainer();
  const urls = [...new Set(String(formData.get("urls") ?? "").split(/\s+/).map((u) => u.trim()).filter(Boolean))].slice(0, 50);
  if (urls.length === 0) fail("/dashboard/videos/import", "Paste at least one video link.");
  const category = String(formData.get("category") ?? "").trim().slice(0, 40) || null;
  const collections = ids(formData, "collections");
  let added = 0, dupes = 0, bad = 0;
  for (const url of urls) {
    const r = await insertLinked(trainer, url, { category, collections });
    if ("id" in r) added++;
    else if (r.error === "duplicate") dupes++;
    else bad++;
  }
  revalidatePath("/", "layout");
  redirect(`/dashboard/videos/import?added=${added}&dupes=${dupes}&bad=${bad}`);
}

const VideoEdit = z.object({
  title: z.string().trim().min(1, "Title is required").max(160),
  category: z.string().trim().max(40),
  description: z.string().trim().max(2000),
  visibility: z.enum(["members", "public"]),
  thumbnail_url: z.string().trim().max(1000).refine((v) => v === "" || /^\/media\/[\w./-]+$/.test(v) || /^https:\/\/[^\s"'<>]+$/.test(v), "Thumbnail must be an image link"),
  published: z.boolean(),
});

export async function updateVideo(id: string, formData: FormData) {
  const trainer = await requireTrainer();
  const parsed = VideoEdit.safeParse({ ...Object.fromEntries(formData), published: formData.get("published") === "on" });
  if (!parsed.success) fail(`/dashboard/videos/${id}`, parsed.error.issues[0].message);
  const v = parsed.data;
  const res = await run(
    "UPDATE videos SET title = ?, category = ?, description = ?, visibility = ?, thumbnail_url = ?, published = ? WHERE id = ? AND trainer_id = ?",
    v.title, v.category || null, v.description || null, v.visibility, v.thumbnail_url || null, v.published ? 1 : 0, id, trainer.id,
  );
  if (res.meta.changes) await setVideoCollections(trainer.id, id, ids(formData, "collections"));
  revalidatePath("/", "layout");
  redirect(`/dashboard/videos/${id}?saved=1`);
}

export async function deleteVideo(id: string) {
  const trainer = await requireTrainer();
  const video = await first<{ provider: string; provider_id: string }>("SELECT provider, provider_id FROM videos WHERE id = ? AND trainer_id = ?", id, trainer.id);
  if (video?.provider === "upload") await (await bindings()).MEDIA.delete(video.provider_id);
  await run("DELETE FROM videos WHERE id = ? AND trainer_id = ?", id, trainer.id);
  revalidatePath("/", "layout");
  redirect("/dashboard/videos");
}

// Collections

export async function createCollection(formData: FormData) {
  const trainer = await requireTrainer();
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  if (!name) fail("/dashboard/videos/collections", "Name the collection.");
  try {
    await run(
      "INSERT INTO collections (id, trainer_id, name, description, sort_order) VALUES (?, ?, ?, ?, (SELECT COUNT(*) FROM collections WHERE trainer_id = ?))",
      newId(), trainer.id, name, String(formData.get("description") ?? "").trim().slice(0, 300) || null, trainer.id,
    );
  } catch (e) {
    if (isDbError(e, "UNIQUE constraint failed")) fail("/dashboard/videos/collections", "You already have a collection with that name.");
    throw e;
  }
  revalidatePath("/", "layout");
}

export async function renameCollection(id: string, formData: FormData) {
  const trainer = await requireTrainer();
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  if (!name) return;
  try {
    await run("UPDATE collections SET name = ?, description = ? WHERE id = ? AND trainer_id = ?", name, String(formData.get("description") ?? "").trim().slice(0, 300) || null, id, trainer.id);
  } catch (e) {
    if (isDbError(e, "UNIQUE constraint failed")) fail("/dashboard/videos/collections", "You already have a collection with that name.");
    throw e;
  }
  revalidatePath("/", "layout");
}

export async function deleteCollection(id: string) {
  const trainer = await requireTrainer();
  await run("DELETE FROM collections WHERE id = ? AND trainer_id = ?", id, trainer.id);
  revalidatePath("/", "layout");
}

// Connected channels (YouTube / Vimeo)

const syncKeys = () => ({ youtubeApiKey: process.env.YOUTUBE_API_KEY, vimeoToken: process.env.VIMEO_ACCESS_TOKEN });

export async function connectSource(formData: FormData) {
  const trainer = await requireTrainer();
  let resolved;
  try {
    resolved = await resolveSource(String(formData.get("channel") ?? ""));
  } catch (e) {
    fail("/dashboard/videos/import", (e as Error).message);
  }
  const id = newId();
  try {
    await run(
      "INSERT INTO video_sources (id, trainer_id, platform, external_id, label, url) VALUES (?, ?, ?, ?, ?, ?)",
      id, trainer.id, resolved.platform, resolved.external_id, resolved.label, resolved.url,
    );
  } catch (e) {
    if (!isDbError(e, "UNIQUE constraint failed")) throw e;
    const existing = await first<{ id: string }>("SELECT id FROM video_sources WHERE trainer_id = ? AND platform = ? AND external_id = ?", trainer.id, resolved.platform, resolved.external_id);
    redirect(`/dashboard/videos/import/${existing!.id}`);
  }
  redirect(`/dashboard/videos/import/${id}`);
}

export async function importFromSource(sourceId: string, formData: FormData) {
  const trainer = await requireTrainer();
  const source = await first<VideoSource>("SELECT * FROM video_sources WHERE id = ? AND trainer_id = ?", sourceId, trainer.id);
  if (!source) redirect("/dashboard/videos/import");
  const picked = new Set(ids(formData, "video"));
  if (picked.size === 0) fail(`/dashboard/videos/import/${sourceId}`, "Select at least one video.");
  let found;
  try {
    found = await listSourceVideos(source, syncKeys());
  } catch (e) {
    fail(`/dashboard/videos/import/${sourceId}`, `Couldn't reach ${source.platform === "youtube" ? "YouTube" : "Vimeo"}: ${(e as Error).message}`);
  }
  const added = await importVideos(await db(), trainer.id, found.filter((v) => picked.has(v.id)), {
    sourceId,
    category: String(formData.get("category") ?? "").trim().slice(0, 40) || null,
    collectionId: String(formData.get("collection") ?? "") || null,
    published: true,
  });
  revalidatePath("/", "layout");
  redirect(`/dashboard/videos/import/${sourceId}?added=${added.length}`);
}

export async function updateSource(sourceId: string, formData: FormData) {
  const trainer = await requireTrainer();
  const collection = String(formData.get("default_collection_id") ?? "");
  const owned = collection ? await first("SELECT id FROM collections WHERE id = ? AND trainer_id = ?", collection, trainer.id) : null;
  await run(
    "UPDATE video_sources SET auto_sync = ?, auto_publish = ?, default_category = ?, default_collection_id = ? WHERE id = ? AND trainer_id = ?",
    formData.get("auto_sync") === "on" ? 1 : 0, formData.get("auto_publish") === "on" ? 1 : 0,
    String(formData.get("default_category") ?? "").trim().slice(0, 40) || null, owned ? collection : null, sourceId, trainer.id,
  );
  revalidatePath("/dashboard/videos/import");
  redirect(`/dashboard/videos/import/${sourceId}?saved=1`);
}

export async function removeSource(sourceId: string) {
  const trainer = await requireTrainer();
  await run("DELETE FROM video_sources WHERE id = ? AND trainer_id = ?", sourceId, trainer.id);
  redirect("/dashboard/videos/import");
}

// ---------------------------------------------------------------------------
// Live + announcements
// ---------------------------------------------------------------------------

const LIVE_PLATFORMS = ["youtube", "instagram", "tiktok", "twitch", "facebook", "x", "other"] as const;

export async function goLive(formData: FormData) {
  const trainer = await requireTrainer();
  if (!trainer.slug) fail("/dashboard/live", "Set up your site link first.");
  const url = safeHttpsUrl(String(formData.get("url") ?? ""));
  if (!url) fail("/dashboard/live", "Paste the https link to your live stream or profile.");
  const chosen = String(formData.get("platform") ?? "");
  const platform: LivePlatform = (LIVE_PLATFORMS as readonly string[]).includes(chosen) ? (chosen as LivePlatform) : platformOf(url);
  const title = String(formData.get("title") ?? "").trim().slice(0, 120) || "Live training";
  // datetime-local has no timezone: convert using the browser's offset (minutes, UTC - local).
  const tzOffset = Number(formData.get("tz_offset") ?? 0) || 0;
  const when = String(formData.get("starts_at") ?? "");
  const startsAt = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(when) ? new Date(Date.parse(`${when}:00Z`) + tzOffset * 60_000) : new Date();
  if (Number.isNaN(startsAt.getTime())) fail("/dashboard/live", "Pick a valid start time.");
  const scheduled = startsAt.getTime() > Date.now() + 5 * 60_000;

  if (!scheduled) await run("UPDATE live_events SET status = 'ended', ended_at = ? WHERE trainer_id = ? AND status = 'live'", nowIso(), trainer.id);
  await run(
    "INSERT INTO live_events (id, trainer_id, platform, url, title, status, starts_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    newId(), trainer.id, platform, url, title, scheduled ? "scheduled" : "live", startsAt.toISOString(),
  );

  const local = new Date(startsAt.getTime() - tzOffset * 60_000);
  await notify({
    trainerId: trainer.id,
    kind: "live",
    title: scheduled ? `${trainer.display_name ?? "Your coach"} is going live` : `🔴 ${trainer.display_name ?? "Your coach"} is live on ${LIVE_LABELS[platform]}`,
    body: scheduled
      ? `${title} · ${local.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC" })} on ${LIVE_LABELS[platform]}`
      : title,
    url,
    icon: iconFor(trainer),
  });
  revalidatePath("/", "layout");
  redirect("/dashboard/live?sent=1");
}

export async function endLive(id: string) {
  const trainer = await requireTrainer();
  await run("UPDATE live_events SET status = 'ended', ended_at = ? WHERE id = ? AND trainer_id = ?", nowIso(), id, trainer.id);
  revalidatePath("/", "layout");
}

export async function sendAnnouncement(formData: FormData) {
  const trainer = await requireTrainer();
  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  const body = String(formData.get("body") ?? "").trim().slice(0, 1000);
  const rawLink = String(formData.get("link") ?? "").trim();
  if (!title) fail("/dashboard/live", "Add a title for your announcement.");
  const link = rawLink ? safeHttpsUrl(rawLink) : null;
  if (rawLink && !link) fail("/dashboard/live", "Links must start with https://");
  await notify({ trainerId: trainer.id, kind: "announcement", title, body, url: link ?? (trainer.slug ? appUrl(trainer) : null), icon: iconFor(trainer) });
  revalidatePath("/", "layout");
  redirect("/dashboard/live?announced=1");
}

// ---------------------------------------------------------------------------
// Workout feedback
// ---------------------------------------------------------------------------

export async function replyToWorkout(id: string, formData: FormData) {
  const trainer = await requireTrainer();
  const body = String(formData.get("body") ?? "").trim().slice(0, 4000);
  const workout = await first<{ id: string; member_id: string; title: string }>(
    "SELECT id, member_id, title FROM workouts WHERE id = ? AND trainer_id = ?",
    id, trainer.id,
  );
  if (!workout) redirect("/dashboard/workouts");
  if (body) await run("INSERT INTO workout_comments (id, workout_id, author, body) VALUES (?, ?, 'trainer', ?)", newId(), id, body);
  await run("UPDATE workouts SET status = 'reviewed', reviewed_at = ? WHERE id = ?", nowIso(), id);
  if (trainer.slug) {
    await notify({
      trainerId: trainer.id,
      memberId: workout.member_id,
      kind: "feedback",
      title: `${trainer.display_name ?? "Your coach"} reviewed “${workout.title}”`,
      body: body ? body.slice(0, 140) : "Marked as reviewed",
      url: appUrl(trainer, `/workouts/${id}`),
      icon: iconFor(trainer),
    });
  }
  revalidatePath("/dashboard", "layout");
  redirect(`/dashboard/workouts/${id}?sent=1`);
}
