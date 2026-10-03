import type { VapidKeys } from "./webpush";

export function vapidFromEnv(env: Record<string, unknown>): VapidKeys | null {
  const pub = env.VAPID_PUBLIC_KEY;
  const priv = env.VAPID_PRIVATE_KEY;
  if (typeof pub !== "string" || typeof priv !== "string" || !pub || !priv) return null;
  const subject = typeof env.VAPID_SUBJECT === "string" && env.VAPID_SUBJECT ? env.VAPID_SUBJECT : "mailto:support@example.com";
  return { publicKey: pub, privateKey: priv, subject };
}
