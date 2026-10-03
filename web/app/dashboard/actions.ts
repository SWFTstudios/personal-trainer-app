"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getUser } from "@/lib/auth/session";
import { normalizeHex } from "@/lib/brand";
import { imageUrl } from "@/lib/cms/blocks";
import { bindings, first, isDbError, newId, nowIso, run, setClause } from "@/lib/db";
import { isPresetKey, PRESETS } from "@/lib/availability";
import { siteUrl } from "@/lib/env";
import { hasActiveSubscription, priceIdFor, TRIAL_DAYS } from "@/lib/plans";
import { stripe } from "@/lib/stripe";
import { SOCIAL_LABELS, safeHttpsUrl } from "@/lib/social";
import { requireTrainer, RESERVED_SLUGS } from "@/lib/trainer";
import { SOCIAL_PLATFORMS } from "@/lib/types";
import type { Plan } from "@/lib/types";

const text = (max: number) => z.string().trim().max(max).transform((v) => v || null);
const optionalImage = imageUrl.transform((v) => v || null);

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

// ---------------------------------------------------------------------------
// Site settings
// ---------------------------------------------------------------------------

const SiteForm = z.object({
  display_name: text(80),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/, "Link must be 3–40 letters, numbers or dashes"),
  headline: text(140),
  bio: text(4000),
  location: text(120),
  logo_url: optionalImage,
  hero_image_url: optionalImage,
  accent_color_hex: z.string().transform((v) => normalizeHex(v)),
  timezone: z.string().refine((tz) => Intl.supportedValuesOf("timeZone").includes(tz) || tz === "UTC", "Unknown timezone"),
  site_published: z.boolean(),
  theme_default: z.enum(["system", "light", "dark"]),
  font_style: z.enum(["modern", "editorial", "athletic"]),
  corner_style: z.enum(["rounded", "soft", "sharp"]),
});

export async function saveSite(formData: FormData) {
  const trainer = await requireTrainer();
  const parsed = SiteForm.safeParse({ ...Object.fromEntries(formData), site_published: formData.get("site_published") === "on" });
  if (!parsed.success) fail("/dashboard/site", parsed.error.issues[0].message);
  if (RESERVED_SLUGS.has(parsed.data.slug)) fail("/dashboard/site", "That link is reserved. Try another.");

  const social: Record<string, string> = {};
  for (const platform of SOCIAL_PLATFORMS) {
    const raw = String(formData.get(`social_${platform}`) ?? "").trim();
    if (!raw) continue;
    const url = safeHttpsUrl(raw, platform);
    if (!url) fail("/dashboard/site", `${SOCIAL_LABELS[platform]} link must be an https link to ${SOCIAL_LABELS[platform]}.`);
    social[platform] = url;
  }

  const { sql, params } = setClause({ ...parsed.data, social_links: JSON.stringify(social), updated_at: nowIso() });
  try {
    await run(`UPDATE trainers SET ${sql} WHERE id = ?`, ...params, trainer.id);
  } catch (e) {
    if (isDbError(e, "UNIQUE constraint failed")) fail("/dashboard/site", "That link is taken. Try another.");
    throw e;
  }
  revalidatePath("/", "layout");
  redirect("/dashboard/site?saved=1");
}

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

const ServiceForm = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  description: text(600),
  duration_minutes: z.coerce.number().int().min(15).max(480),
  price: z.coerce.number().min(0).max(10_000),
  active: z.boolean(),
});

function parseService(formData: FormData) {
  const parsed = ServiceForm.safeParse({ ...Object.fromEntries(formData), active: formData.get("active") === "on" });
  if (!parsed.success) fail("/dashboard/services", parsed.error.issues[0].message);
  const { price, ...rest } = parsed.data;
  return { ...rest, price_cents: Math.round(price * 100) };
}

export async function createService(formData: FormData) {
  const trainer = await requireTrainer();
  const s = parseService(formData);
  await run(
    "INSERT INTO services (id, trainer_id, name, description, duration_minutes, price_cents, active) VALUES (?, ?, ?, ?, ?, ?, ?)",
    newId(), trainer.id, s.name, s.description, s.duration_minutes, s.price_cents, s.active ? 1 : 0,
  );
  revalidatePath("/", "layout");
}

export async function updateService(id: string, formData: FormData) {
  const trainer = await requireTrainer();
  const { sql, params } = setClause(parseService(formData));
  await run(`UPDATE services SET ${sql} WHERE id = ? AND trainer_id = ?`, ...params, id, trainer.id);
  revalidatePath("/", "layout");
}

export async function deleteService(id: string) {
  const trainer = await requireTrainer();
  await run("DELETE FROM services WHERE id = ? AND trainer_id = ?", id, trainer.id);
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------------

const RuleForm = z
  .object({
    weekday: z.coerce.number().int().min(0).max(6),
    start_time: z.string().regex(/^\d{2}:\d{2}$/),
    end_time: z.string().regex(/^\d{2}:\d{2}$/),
  })
  .refine((r) => r.end_time > r.start_time, "End time must be after start time");

export async function addAvailability(formData: FormData) {
  const trainer = await requireTrainer();
  const parsed = RuleForm.safeParse(Object.fromEntries(formData));
  if (!parsed.success) fail("/dashboard/availability", parsed.error.issues[0].message);
  const r = parsed.data;
  await run(
    "INSERT INTO availability_rules (id, trainer_id, weekday, start_time, end_time) VALUES (?, ?, ?, ?, ?)",
    newId(), trainer.id, r.weekday, r.start_time, r.end_time,
  );
  revalidatePath("/dashboard/availability");
}

export async function deleteAvailability(id: string) {
  const trainer = await requireTrainer();
  await run("DELETE FROM availability_rules WHERE id = ? AND trainer_id = ?", id, trainer.id);
  revalidatePath("/dashboard/availability");
}

export async function clearAvailabilityDay(weekday: number) {
  const trainer = await requireTrainer();
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return;
  await run("DELETE FROM availability_rules WHERE trainer_id = ? AND weekday = ?", trainer.id, weekday);
  revalidatePath("/dashboard/availability");
}

/** Replace the whole week with a preset, in one atomic batch. */
export async function applyAvailabilityPreset(formData: FormData) {
  const trainer = await requireTrainer();
  const key = String(formData.get("preset") ?? "");
  if (!isPresetKey(key)) fail("/dashboard/availability", "Unknown preset.");
  const { DB } = await bindings();
  await DB.batch([
    DB.prepare("DELETE FROM availability_rules WHERE trainer_id = ?").bind(trainer.id),
    ...PRESETS[key].rules.map((r) =>
      DB.prepare("INSERT INTO availability_rules (id, trainer_id, weekday, start_time, end_time) VALUES (?, ?, ?, ?, ?)").bind(newId(), trainer.id, r.weekday, r.start_time, r.end_time),
    ),
  ]);
  revalidatePath("/dashboard/availability");
}

// ---------------------------------------------------------------------------
// Intake
// ---------------------------------------------------------------------------

const QuestionForm = z.object({
  label: z.string().trim().min(1, "Question is required").max(300),
  kind: z.enum(["text", "long_text", "select", "yes_no"]),
  options: z.string().default(""),
  required: z.boolean(),
});

async function insertQuestion(trainerId: string, q: { label: string; kind: string; options: string[]; required: boolean }) {
  const next = await first<{ n: number }>("SELECT COUNT(*) AS n FROM intake_questions WHERE trainer_id = ?", trainerId);
  await run(
    "INSERT INTO intake_questions (id, trainer_id, label, kind, options, required, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
    newId(), trainerId, q.label, q.kind, JSON.stringify(q.options), q.required ? 1 : 0, next?.n ?? 0,
  );
}

export async function addQuestion(formData: FormData) {
  const trainer = await requireTrainer();
  const parsed = QuestionForm.safeParse({ ...Object.fromEntries(formData), required: formData.get("required") === "on" });
  if (!parsed.success) fail("/dashboard/intake", parsed.error.issues[0].message);
  const options = parsed.data.options.split(",").map((o) => o.trim()).filter(Boolean);
  if (parsed.data.kind === "select" && options.length < 2) fail("/dashboard/intake", "Add at least two comma-separated options.");
  await insertQuestion(trainer.id, { ...parsed.data, options: parsed.data.kind === "select" ? options : [] });
  revalidatePath("/dashboard/intake");
}

export async function addStarterQuestions() {
  const trainer = await requireTrainer();
  const starter = [
    { label: "What are your main goals?", kind: "long_text", options: [], required: true },
    { label: "Any injuries, conditions or medications I should know about?", kind: "long_text", options: [], required: true },
    { label: "Training experience", kind: "select", options: ["New to training", "Some experience", "Experienced"], required: true },
    { label: "Has a doctor ever advised you not to exercise?", kind: "yes_no", options: [], required: true },
  ];
  for (const q of starter) await insertQuestion(trainer.id, q);
  revalidatePath("/dashboard/intake");
}

export async function deleteQuestion(id: string) {
  const trainer = await requireTrainer();
  await run("DELETE FROM intake_questions WHERE id = ? AND trainer_id = ?", id, trainer.id);
  revalidatePath("/dashboard/intake");
}

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

export async function cancelBooking(id: string) {
  const trainer = await requireTrainer();
  await run("UPDATE bookings SET status = 'cancelled' WHERE id = ? AND trainer_id = ?", id, trainer.id);
  revalidatePath("/dashboard");
}

// ---------------------------------------------------------------------------
// Billing (trainer → platform) and payouts (client → trainer)
// ---------------------------------------------------------------------------

export async function startSubscription(plan: Plan) {
  const trainer = await requireTrainer();
  if (hasActiveSubscription(trainer.subscription_status)) return openBillingPortal();
  const user = await getUser();

  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceIdFor(plan), quantity: 1 }],
    client_reference_id: trainer.id,
    ...(trainer.stripe_customer_id ? { customer: trainer.stripe_customer_id } : { customer_email: user?.email }),
    subscription_data: {
      metadata: { trainer_id: trainer.id },
      // One free trial per trainer: returning customers start paying right away.
      ...(trainer.stripe_customer_id ? {} : { trial_period_days: TRIAL_DAYS }),
    },
    allow_promotion_codes: true,
    success_url: `${siteUrl()}/dashboard/billing?subscribed=1`,
    cancel_url: `${siteUrl()}/dashboard/billing`,
  });
  redirect(session.url!);
}

export async function openBillingPortal() {
  const trainer = await requireTrainer();
  if (!trainer.stripe_customer_id) redirect("/dashboard/billing");
  const session = await stripe().billingPortal.sessions.create({
    customer: trainer.stripe_customer_id,
    return_url: `${siteUrl()}/dashboard/billing`,
  });
  redirect(session.url);
}

export async function connectStripe() {
  const trainer = await requireTrainer();
  let accountId = trainer.stripe_account_id;
  if (!accountId) {
    const user = await getUser();
    const account = await stripe().accounts.create({
      type: "express",
      email: user?.email,
      business_type: "individual",
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
      metadata: { trainer_id: trainer.id },
    });
    accountId = account.id;
    await run("UPDATE trainers SET stripe_account_id = ? WHERE id = ?", accountId, trainer.id);
  }
  const link = await stripe().accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    refresh_url: `${siteUrl()}/dashboard/billing`,
    return_url: `${siteUrl()}/dashboard/billing?connected=1`,
  });
  redirect(link.url);
}

export async function openPayoutDashboard() {
  const trainer = await requireTrainer();
  if (!trainer.stripe_account_id) redirect("/dashboard/billing");
  const link = await stripe().accounts.createLoginLink(trainer.stripe_account_id);
  redirect(link.url);
}
