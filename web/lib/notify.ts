import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { all, db } from "@/lib/db";
import { notifyWithDb } from "@/lib/push/fanout";
import { vapidFromEnv } from "@/lib/push/env";
import type { VapidKeys } from "@/lib/push/webpush";
import type { NotificationKind } from "@/lib/types";

export const vapidKeys = (): VapidKeys | null => vapidFromEnv(process.env);

type Notice = {
  trainerId: string;
  /** Omit to notify every member of the trainer. */
  memberId?: string;
  kind: NotificationKind;
  title: string;
  body?: string | null;
  url?: string | null;
  icon?: string | null;
};

/** Records an in-app notification and pushes it to subscribed devices in the background. */
export async function notify(n: Notice) {
  const { work } = await notifyWithDb(await db(), n, vapidKeys());
  try {
    (await getCloudflareContext({ async: true })).ctx.waitUntil(work);
  } catch {
    await work;
  }
}

export async function unreadCount(memberId: string, trainerId: string, seenAt: string): Promise<number> {
  const rows = await all<{ n: number }>(
    "SELECT COUNT(*) AS n FROM notifications WHERE trainer_id = ? AND (member_id IS NULL OR member_id = ?) AND created_at > ?",
    trainerId, memberId, seenAt,
  );
  return rows[0]?.n ?? 0;
}
