import { newIdPlain } from "../ids";
import { notifyWithDb } from "../push/fanout";
import type { VapidKeys } from "../push/webpush";
import type { VideoSource } from "../types";
import { listSourceVideos, type FoundVideo, type SyncKeys } from "./sources";

/** Adds the given found videos to a trainer's library; skips ones already there. Returns ids of new rows. */
export async function importVideos(
  db: D1Database,
  trainerId: string,
  videos: FoundVideo[],
  opts: { sourceId?: string | null; category?: string | null; collectionId?: string | null; published: boolean },
): Promise<string[]> {
  const added: string[] = [];
  for (const v of videos) {
    const id = newIdPlain();
    const res = await db
      .prepare(
        `INSERT INTO videos (id, trainer_id, provider, provider_id, url, title, category, thumbnail_url, published, source_id, published_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (trainer_id, provider, provider_id) DO NOTHING`,
      )
      .bind(id, trainerId, v.provider, v.id, v.url, v.title.slice(0, 160), opts.category ?? null, v.thumbnail_url, opts.published ? 1 : 0, opts.sourceId ?? null, v.published_at)
      .run();
    if (!res.meta.changes) continue;
    added.push(id);
    if (opts.collectionId) {
      await db
        .prepare(
          `INSERT OR IGNORE INTO video_collections (video_id, collection_id, sort_order)
           SELECT ?, id, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM video_collections) FROM collections WHERE id = ? AND trainer_id = ?`,
        )
        .bind(id, opts.collectionId, trainerId)
        .run();
    }
  }
  return added;
}

/** Pull new uploads for one connected channel. */
export async function syncSource(db: D1Database, source: VideoSource, keys: SyncKeys) {
  try {
    const found = await listSourceVideos(source, keys);
    const added = await importVideos(db, source.trainer_id, found, {
      sourceId: source.id,
      category: source.default_category,
      collectionId: source.default_collection_id,
      published: Boolean(source.auto_publish),
    });
    await db.prepare("UPDATE video_sources SET last_synced_at = ?, last_error = NULL WHERE id = ?").bind(new Date().toISOString(), source.id).run();
    return { added, found: found.length };
  } catch (e) {
    await db.prepare("UPDATE video_sources SET last_synced_at = ?, last_error = ? WHERE id = ?").bind(new Date().toISOString(), String((e as Error).message).slice(0, 300), source.id).run();
    return { added: [], found: 0, error: (e as Error).message };
  }
}

/** Cron entry point: sync every auto-sync channel not checked in the last 25 minutes. */
export async function runAutoSync(db: D1Database, keys: SyncKeys, vapid: VapidKeys | null) {
  const cutoff = new Date(Date.now() - 25 * 60_000).toISOString();
  const { results: sources } = await db
    .prepare("SELECT * FROM video_sources WHERE auto_sync = 1 AND (last_synced_at IS NULL OR last_synced_at < ?) LIMIT 50")
    .bind(cutoff)
    .all<VideoSource>();
  const pushes: Promise<unknown>[] = [];
  for (const s of sources) {
    const { added } = await syncSource(db, s, keys);
    if (!added.length || !s.auto_publish) continue;
    const trainer = await db.prepare("SELECT slug, display_name, logo_url FROM trainers WHERE id = ?").bind(s.trainer_id).first<{ slug: string | null; display_name: string | null; logo_url: string | null }>();
    if (!trainer?.slug) continue;
    const first = await db.prepare("SELECT title FROM videos WHERE id = ?").bind(added[0]).first<{ title: string }>();
    const { work } = await notifyWithDb(
      db,
      {
        trainerId: s.trainer_id,
        kind: "video",
        title: added.length === 1 ? `New video: ${first?.title ?? ""}` : `${added.length} new videos from ${trainer.display_name ?? "your coach"}`,
        url: added.length === 1 ? `/${trainer.slug}/app/videos/${added[0]}` : `/${trainer.slug}/app/videos`,
        icon: trainer.logo_url ?? `/${trainer.slug}/icon`,
      },
      vapid,
    );
    pushes.push(work);
  }
  await Promise.allSettled(pushes);
  return sources.length;
}
