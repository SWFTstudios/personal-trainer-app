"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { normalizeHex } from "@/lib/brand";
import { siteUrl } from "@/lib/env";
import { hasActiveSubscription, priceIdFor, TRIAL_DAYS } from "@/lib/plans";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireTrainer, RESERVED_SLUGS } from "@/lib/trainer";

const text = (max: number) =>
  z.string().trim().max(max).transform((v) => v || null);
const url = z.union([z.literal(""), z.url().max(1000)]).transform((v) => v || null);

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

// ---------------------------------------------------------------------------
// Site
// ---------------------------------------------------------------------------

const SiteForm = z.object({
  display_name: text(80),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/, "Link must be 3–40 letters, numbers or dashes"),
  headline: text(140),
  bio: text(4000),
  location: text(120),
  instagram_url: url,
  logo_url: url,
  hero_image_url: url,
  accent_color_hex: z.string().transform((v) => normalizeHex(v)),
  timezone: z.string().refine((tz) => Intl.supportedValuesOf("timeZone").includes(tz) || tz === "UTC", "Unknown timezone"),
  site_published: z.boolean(),
});

export async function saveSite(formData: FormData) {
  const trainer = await requireTrainer();
  const parsed = SiteForm.safeParse({
    ...Object.fromEntries(formData),
    site_published: formData.get("site_published") === "on",
  });
  if (!parsed.success) fail("/dashboard/site", parsed.error.issues[0].message);
  if (RESERVED_SLUGS.has(parsed.data.slug)) fail("/dashboard/site", "That link is reserved. Try another.");

  const supabase = await createClient();
  const { error } = await supabase.from("trainers").update(parsed.data).eq("id", trainer.id);
  if (error?.code === "23505") fail("/dashboard/site", "That link is taken. Try another.");
  if (error) fail("/dashboard/site", "Couldn't save. Please try again.");

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
  const supabase = await createClient();
  const { error } = await supabase.from("services").insert({ ...parseService(formData), trainer_id: trainer.id });
  if (error) fail("/dashboard/services", "Couldn't add the service.");
  revalidatePath("/", "layout");
}

export async function updateService(id: string, formData: FormData) {
  await requireTrainer();
  const supabase = await createClient();
  const { error } = await supabase.from("services").update(parseService(formData)).eq("id", id);
  if (error) fail("/dashboard/services", "Couldn't save the service.");
  revalidatePath("/", "layout");
}

export async function deleteService(id: string) {
  await requireTrainer();
  const supabase = await createClient();
  await supabase.from("services").delete().eq("id", id);
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
  const supabase = await createClient();
  const { error } = await supabase.from("availability_rules").insert({ ...parsed.data, trainer_id: trainer.id });
  if (error) fail("/dashboard/availability", "Couldn't add the hours.");
  revalidatePath("/dashboard/availability");
}

export async function deleteAvailability(id: string) {
  await requireTrainer();
  const supabase = await createClient();
  await supabase.from("availability_rules").delete().eq("id", id);
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

export async function addQuestion(formData: FormData) {
  const trainer = await requireTrainer();
  const parsed = QuestionForm.safeParse({ ...Object.fromEntries(formData), required: formData.get("required") === "on" });
  if (!parsed.success) fail("/dashboard/intake", parsed.error.issues[0].message);
  const options = parsed.data.options.split(",").map((o) => o.trim()).filter(Boolean);
  if (parsed.data.kind === "select" && options.length < 2) fail("/dashboard/intake", "Add at least two comma-separated options.");

  const supabase = await createClient();
  const { count } = await supabase.from("intake_questions").select("id", { count: "exact", head: true }).eq("trainer_id", trainer.id);
  const { error } = await supabase.from("intake_questions").insert({
    trainer_id: trainer.id,
    label: parsed.data.label,
    kind: parsed.data.kind,
    options: parsed.data.kind === "select" ? options : [],
    required: parsed.data.required,
    sort_order: count ?? 0,
  });
  if (error) fail("/dashboard/intake", "Couldn't add the question.");
  revalidatePath("/dashboard/intake");
}

export async function addStarterQuestions() {
  const trainer = await requireTrainer();
  const supabase = await createClient();
  await supabase.from("intake_questions").insert(
    [
      { label: "What are your main goals?", kind: "long_text", required: true },
      { label: "Any injuries, conditions or medications I should know about?", kind: "long_text", required: true },
      { label: "Training experience", kind: "select", options: ["New to training", "Some experience", "Experienced"], required: true },
      { label: "Has a doctor ever advised you not to exercise?", kind: "yes_no", required: true },
    ].map((q, i) => ({ options: [], ...q, trainer_id: trainer.id, sort_order: i })),
  );
  revalidatePath("/dashboard/intake");
}

export async function deleteQuestion(id: string) {
  await requireTrainer();
  const supabase = await createClient();
  await supabase.from("intake_questions").delete().eq("id", id);
  revalidatePath("/dashboard/intake");
}

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

export async function cancelBooking(id: string) {
  await requireTrainer();
  const supabase = await createClient();
  await supabase.from("bookings").update({ status: "cancelled" }).eq("id", id);
  revalidatePath("/dashboard");
}

// ---------------------------------------------------------------------------
// Billing (trainer → platform) and payouts (client → trainer)
// ---------------------------------------------------------------------------

export async function startSubscription(plan: "starter" | "pro") {
  const trainer = await requireTrainer();
  if (hasActiveSubscription(trainer.subscription_status)) return openBillingPortal();

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceIdFor(plan), quantity: 1 }],
    client_reference_id: trainer.id,
    ...(trainer.stripe_customer_id ? { customer: trainer.stripe_customer_id } : { customer_email: auth.user?.email }),
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
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    const account = await stripe().accounts.create({
      type: "express",
      email: auth.user?.email,
      business_type: "individual",
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
      metadata: { trainer_id: trainer.id },
    });
    accountId = account.id;
    await createAdminClient().from("trainers").update({ stripe_account_id: accountId }).eq("id", trainer.id);
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
