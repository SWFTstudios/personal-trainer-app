import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hasActiveSubscription } from "@/lib/plans";
import type { PublicTrainer, Trainer } from "@/lib/types";

const PUBLIC_COLUMNS =
  "id, slug, display_name, headline, bio, logo_url, hero_image_url, accent_color_hex, location, instagram_url, timezone, plan, stripe_account_id, stripe_charges_enabled, site_published, subscription_status";

export const RESERVED_SLUGS = new Set(["dashboard", "login", "logout", "auth", "api", "pricing", "admin", "app", "www"]);

/** A trainer whose site is live: published with an active or trialing subscription. */
export const getPublishedTrainer = cache(async (slug: string): Promise<PublicTrainer | null> => {
  const { data } = await createAdminClient()
    .from("trainers")
    .select(PUBLIC_COLUMNS)
    .eq("slug", slug.toLowerCase())
    .maybeSingle();
  if (!data || !data.site_published || !hasActiveSubscription(data.subscription_status)) return null;
  const { site_published: _p, subscription_status: _s, ...trainer } = data;
  return trainer as PublicTrainer;
});

/** The signed-in trainer, creating their trainer row on first visit. */
export const requireTrainer = cache(async (): Promise<Trainer> => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: existing } = await supabase.from("trainers").select("*").eq("user_id", auth.user.id).maybeSingle();
  if (existing) return existing as Trainer;

  const { data: created, error } = await supabase
    .from("trainers")
    .insert({ user_id: auth.user.id })
    .select("*")
    .single();
  if (error) throw error;
  return created as Trainer;
});
