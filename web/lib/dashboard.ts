import "server-only";
import type { MediaItem } from "@/components/dashboard/MediaPicker";
import { mediaUrl } from "@/lib/cms/media";
import { all } from "@/lib/db";
import { hasActiveSubscription } from "@/lib/plans";
import type { Media, Trainer } from "@/lib/types";

export async function getMediaLibrary(trainerId: string): Promise<MediaItem[]> {
  const rows = await all<Media>("SELECT * FROM media WHERE trainer_id = ? ORDER BY created_at DESC LIMIT 500", trainerId);
  return rows.map((m) => ({ id: m.id, url: mediaUrl(m.r2_key), alt: m.alt, filename: m.filename }));
}

/** Public base path of the trainer's site, or null if it isn't live yet. */
export function liveSiteBase(t: Trainer): string | null {
  return t.slug && t.site_published && hasActiveSubscription(t.subscription_status) ? `/${t.slug}` : null;
}
