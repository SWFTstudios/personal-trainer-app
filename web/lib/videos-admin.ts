import "server-only";
import { all, bindings, first } from "@/lib/db";
import type { Collection } from "@/lib/types";

export async function getCollections(trainerId: string): Promise<(Collection & { count: number })[]> {
  return all(
    `SELECT c.*, (SELECT COUNT(*) FROM video_collections vc WHERE vc.collection_id = c.id) AS count
     FROM collections c WHERE c.trainer_id = ? ORDER BY c.sort_order, c.name`,
    trainerId,
  );
}

/** Replace a video's collections, ignoring ids that don't belong to this trainer. */
export async function setVideoCollections(trainerId: string, videoId: string, collectionIds: string[]) {
  const owned = collectionIds.length
    ? (await all<{ id: string }>(
        `SELECT id FROM collections WHERE trainer_id = ? AND id IN (${collectionIds.map(() => "?").join(",")})`,
        trainerId, ...collectionIds,
      )).map((r) => r.id)
    : [];
  const { DB } = await bindings();
  const next = await first<{ n: number }>("SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM video_collections");
  await DB.batch([
    DB.prepare("DELETE FROM video_collections WHERE video_id = ?").bind(videoId),
    ...owned.map((cid, i) => DB.prepare("INSERT INTO video_collections (video_id, collection_id, sort_order) VALUES (?, ?, ?)").bind(videoId, cid, (next?.n ?? 0) + i)),
  ]);
}

export async function getVideoCollectionIds(videoId: string): Promise<string[]> {
  return (await all<{ collection_id: string }>("SELECT collection_id FROM video_collections WHERE video_id = ?", videoId)).map((r) => r.collection_id);
}
