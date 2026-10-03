import "server-only";
import { all, first } from "@/lib/db";
import { toVideo, toWorkout } from "@/lib/rows";
import type { AppNotification, LiveEvent, Video, Workout, WorkoutComment } from "@/lib/types";

/** Live now (started in the last 12h and not ended), else the next scheduled one. */
export async function getCurrentLive(trainerId: string, now = new Date()): Promise<LiveEvent | null> {
  const since = new Date(now.getTime() - 12 * 3600_000).toISOString();
  return first<LiveEvent>(
    `SELECT * FROM live_events WHERE trainer_id = ?1 AND (
       (status = 'live' AND starts_at > ?2) OR (status = 'scheduled' AND starts_at > ?3))
     ORDER BY CASE status WHEN 'live' THEN 0 ELSE 1 END, starts_at LIMIT 1`,
    trainerId, since, now.toISOString(),
  );
}

export async function getVideos(
  trainerId: string,
  opts: { category?: string; collectionId?: string; limit?: number; publishedOnly?: boolean; publicOnly?: boolean } = {},
): Promise<Video[]> {
  const where = ["v.trainer_id = ?"];
  const params: unknown[] = [trainerId];
  if (opts.publishedOnly !== false) where.push("v.published = 1");
  if (opts.publicOnly) where.push("v.visibility = 'public'");
  if (opts.category) {
    where.push("v.category = ?");
    params.push(opts.category);
  }
  const join = opts.collectionId ? "JOIN video_collections vc ON vc.video_id = v.id AND vc.collection_id = ?" : "";
  if (opts.collectionId) params.unshift(opts.collectionId);
  const order = opts.collectionId ? "vc.sort_order, v.created_at" : "COALESCE(v.published_at, v.created_at) DESC";
  const rows = await all<Parameters<typeof toVideo>[0]>(
    `SELECT v.* FROM videos v ${join} WHERE ${where.join(" AND ")} ORDER BY ${order} LIMIT ${Math.min(opts.limit ?? 200, 500)}`,
    ...params,
  );
  return rows.map(toVideo);
}

/** Collections that have at least one visible video, with a cover thumbnail. */
export async function getVisibleCollections(trainerId: string, publicOnly = false) {
  return all<{ id: string; name: string; description: string | null; count: number; cover: string | null }>(
    `SELECT c.id, c.name, c.description, COUNT(v.id) AS count,
            (SELECT v2.thumbnail_url FROM video_collections vc2 JOIN videos v2 ON v2.id = vc2.video_id
             WHERE vc2.collection_id = c.id AND v2.published = 1 AND v2.thumbnail_url IS NOT NULL ORDER BY vc2.sort_order LIMIT 1) AS cover
     FROM collections c JOIN video_collections vc ON vc.collection_id = c.id
     JOIN videos v ON v.id = vc.video_id AND v.published = 1 ${publicOnly ? "AND v.visibility = 'public'" : ""}
     WHERE c.trainer_id = ? GROUP BY c.id ORDER BY c.sort_order, c.name`,
    trainerId,
  );
}

export async function getVideoCategories(trainerId: string): Promise<string[]> {
  const rows = await all<{ category: string }>(
    "SELECT DISTINCT category FROM videos WHERE trainer_id = ? AND published = 1 AND category IS NOT NULL AND category <> '' ORDER BY category",
    trainerId,
  );
  return rows.map((r) => r.category);
}

export async function getMemberNotifications(trainerId: string, memberId: string, limit = 50): Promise<AppNotification[]> {
  return all<AppNotification>(
    "SELECT * FROM notifications WHERE trainer_id = ? AND (member_id IS NULL OR member_id = ?) ORDER BY created_at DESC LIMIT ?",
    trainerId, memberId, limit,
  );
}

export async function getMemberWorkouts(memberId: string, limit = 200): Promise<Workout[]> {
  const rows = await all<Parameters<typeof toWorkout>[0]>(
    "SELECT * FROM workouts WHERE member_id = ? ORDER BY performed_on DESC, created_at DESC LIMIT ?",
    memberId, limit,
  );
  return rows.map(toWorkout);
}

export async function getWorkoutThread(workoutId: string): Promise<WorkoutComment[]> {
  return all<WorkoutComment>("SELECT * FROM workout_comments WHERE workout_id = ? ORDER BY created_at", workoutId);
}

export function relativeTime(iso: string, now = new Date()): string {
  const s = Math.round((now.getTime() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 7 * 86_400) return `${Math.floor(s / 86_400)}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
