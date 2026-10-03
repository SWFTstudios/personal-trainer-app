import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { first, newId, run } from "@/lib/db";
import { hasActiveSubscription } from "@/lib/plans";
import { toTrainer } from "@/lib/rows";
import type { PublicTrainer, Trainer } from "@/lib/types";

export const RESERVED_SLUGS = new Set([
  "dashboard", "login", "signup", "logout", "auth", "api", "admin", "media", "pricing", "app", "www", "_next",
]);

export const getTrainerBySlug = cache(async (slug: string): Promise<Trainer | null> => {
  const row = await first<Parameters<typeof toTrainer>[0]>("SELECT * FROM trainers WHERE slug = ?", slug.toLowerCase());
  return row ? toTrainer(row) : null;
});

/** A trainer whose site is live: published with an active or trialing subscription. */
export const getPublishedTrainer = cache(async (slug: string): Promise<PublicTrainer | null> => {
  const trainer = await getTrainerBySlug(slug);
  if (!trainer?.slug || !trainer.site_published || !hasActiveSubscription(trainer.subscription_status)) return null;
  return trainer as PublicTrainer;
});

/** The signed-in user's trainer row, created on first use. */
export const requireTrainer = cache(async (): Promise<Trainer> => {
  const user = await requireUser();
  let row = await first<Parameters<typeof toTrainer>[0]>("SELECT * FROM trainers WHERE user_id = ?", user.id);
  if (!row) {
    await run("INSERT INTO trainers (id, user_id) VALUES (?, ?)", newId(), user.id);
    row = await first("SELECT * FROM trainers WHERE user_id = ?", user.id);
  }
  if (!row) redirect("/login");
  return toTrainer(row);
});
