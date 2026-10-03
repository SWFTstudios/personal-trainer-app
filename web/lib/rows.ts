import type { Block } from "@/lib/cms/blocks";
import type { Booking, IntakeQuestion, Service, Trainer } from "@/lib/types";

// D1 returns SQLite booleans as 0/1 and JSON columns as text; these map rows to app types.
type Raw<T, K extends keyof T> = Omit<T, K> & { [P in K]: unknown };

export const toTrainer = (r: Raw<Trainer, "site_published" | "stripe_charges_enabled">): Trainer => ({
  ...r,
  site_published: Boolean(r.site_published),
  stripe_charges_enabled: Boolean(r.stripe_charges_enabled),
});

export const toService = (r: Raw<Service, "active">): Service => ({ ...r, active: Boolean(r.active) });

export const toQuestion = (r: Raw<IntakeQuestion, "options" | "required">): IntakeQuestion => ({
  ...r,
  options: parseJson<string[]>(r.options, []),
  required: Boolean(r.required),
});

export const toBooking = (r: Raw<Booking, "intake_answers">): Booking => ({
  ...r,
  intake_answers: parseJson(r.intake_answers, []),
});

export type Page = {
  id: string;
  trainer_id: string;
  path: string;
  title: string;
  seo_description: string | null;
  blocks: Block[];
  published: boolean;
  show_in_nav: boolean;
  sort_order: number;
  updated_at: string;
};

export const toPage = (r: Raw<Page, "blocks" | "published" | "show_in_nav">): Page => ({
  ...r,
  blocks: parseJson<Block[]>(r.blocks, []),
  published: Boolean(r.published),
  show_in_nav: Boolean(r.show_in_nav),
});

export function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
