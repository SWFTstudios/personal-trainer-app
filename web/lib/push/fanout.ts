import { newIdPlain } from "../ids";
import { sendPush, type VapidKeys } from "./webpush";

export type PushMessage = { title: string; body?: string; url?: string; tag?: string; icon?: string };

/**
 * Records an in-app notification and pushes it to subscribed devices.
 * Takes the D1 binding directly so it also works from the scheduled (cron) handler.
 */
export async function notifyWithDb(
  db: D1Database,
  n: { trainerId: string; memberId?: string | null; kind: string; title: string; body?: string | null; url?: string | null; icon?: string | null },
  vapid: VapidKeys | null,
): Promise<{ work: Promise<unknown> }> {
  await db
    .prepare("INSERT INTO notifications (id, trainer_id, member_id, kind, title, body, url) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(newIdPlain(), n.trainerId, n.memberId ?? null, n.kind, n.title, n.body ?? null, n.url ?? null)
    .run();
  if (!vapid) return { work: Promise.resolve() };

  const { results: subs } = n.memberId
    ? await db.prepare("SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE member_id = ?").bind(n.memberId).all<Sub>()
    : await db
        .prepare("SELECT s.id, s.endpoint, s.p256dh, s.auth FROM push_subscriptions s JOIN members m ON m.id = s.member_id WHERE m.trainer_id = ?")
        .bind(n.trainerId)
        .all<Sub>();

  const message: PushMessage = { title: n.title, body: n.body ?? "", url: n.url ?? "/", tag: n.kind, icon: n.icon ?? undefined };
  // Returned unawaited so the caller can hand it to waitUntil.
  const work = Promise.allSettled(
    subs.map(async (s) => {
      const result = await sendPush(s, message, vapid, n.kind === "live" ? 1800 : 86_400);
      if (result.gone) await db.prepare("DELETE FROM push_subscriptions WHERE id = ?").bind(s.id).run();
    }),
  );
  return { work };
}

type Sub = { id: string; endpoint: string; p256dh: string; auth: string };
