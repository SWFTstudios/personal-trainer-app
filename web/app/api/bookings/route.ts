import { NextResponse, type NextRequest } from "next/server";
import { addMinutes } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { z } from "zod";
import { availableSlots, getActiveService } from "@/lib/booking";
import { env, siteUrl } from "@/lib/env";
import { formatSlot } from "@/lib/format";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublishedTrainer } from "@/lib/trainer";
import type { IntakeQuestion } from "@/lib/types";

// Stripe requires checkout sessions to live at least 30 minutes.
const CHECKOUT_TTL_MINUTES = 30;
const HOLD_GRACE_MINUTES = 5;

const BookingRequest = z.object({
  slug: z.string().min(1),
  serviceId: z.uuid(),
  startsAt: z.iso.datetime(),
  name: z.string().trim().min(1).max(120),
  email: z.email().max(200),
  phone: z.string().trim().max(40).optional().default(""),
  answers: z.record(z.string(), z.string().max(4000)).default({}),
});

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  const parsed = BookingRequest.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return error("Please check your details and try again.", 400);
  const input = parsed.data;

  const trainer = await getPublishedTrainer(input.slug);
  if (!trainer) return error("This page is not available.", 404);
  const service = await getActiveService(trainer.id, input.serviceId);
  if (!service) return error("That session type is no longer offered.", 404);

  const start = new Date(input.startsAt);
  const localDate = formatInTimeZone(start, trainer.timezone, "yyyy-MM-dd");
  const slots = await availableSlots(trainer, service, localDate);
  if (!slots.some((s) => s.getTime() === start.getTime())) {
    return error("That time was just taken. Please pick another.", 409);
  }

  const admin = createAdminClient();
  const { data: questions } = await admin
    .from("intake_questions")
    .select("*")
    .eq("trainer_id", trainer.id)
    .order("sort_order");
  const intake: { question: string; answer: string }[] = [];
  for (const q of (questions ?? []) as IntakeQuestion[]) {
    const answer = (input.answers[q.id] ?? "").trim();
    if (q.required && !answer) return error(`Please answer: ${q.label}`, 400);
    if (answer && q.kind === "select" && !q.options.includes(answer)) return error(`Invalid answer for: ${q.label}`, 400);
    if (answer && q.kind === "yes_no" && answer !== "Yes" && answer !== "No") return error(`Invalid answer for: ${q.label}`, 400);
    if (answer) intake.push({ question: q.label, answer });
  }

  const isPaid = service.price_cents > 0;
  if (isPaid && (!trainer.stripe_account_id || !trainer.stripe_charges_enabled)) {
    return error("Online payments aren't set up for this trainer yet.", 409);
  }

  await admin.rpc("release_expired_holds", { p_trainer_id: trainer.id });

  const now = new Date();
  const { data: booking, error: insertError } = await admin
    .from("bookings")
    .insert({
      trainer_id: trainer.id,
      service_id: service.id,
      service_name: service.name,
      client_name: input.name,
      client_email: input.email,
      client_phone: input.phone || null,
      starts_at: start.toISOString(),
      ends_at: addMinutes(start, service.duration_minutes).toISOString(),
      status: isPaid ? "pending_payment" : "confirmed",
      hold_expires_at: isPaid ? addMinutes(now, CHECKOUT_TTL_MINUTES + HOLD_GRACE_MINUTES).toISOString() : null,
      amount_cents: service.price_cents,
      currency: service.currency,
      intake_answers: intake,
    })
    .select("id")
    .single();

  if (insertError) {
    // 23P01 = exclusion violation: someone else grabbed an overlapping slot.
    if (insertError.code === "23P01") return error("That time was just taken. Please pick another.", 409);
    console.error("booking insert failed", insertError);
    return error("Something went wrong. Please try again.", 500);
  }

  const successUrl = `${siteUrl()}/${trainer.slug}/book/confirmed?booking=${booking.id}`;
  if (!isPaid) return NextResponse.json({ redirectUrl: successUrl });

  try {
    const feeBps = env.platformFeeBps();
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      customer_email: input.email,
      expires_at: Math.floor(addMinutes(now, CHECKOUT_TTL_MINUTES).getTime() / 1000),
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: service.currency,
            unit_amount: service.price_cents,
            product_data: {
              name: `${service.name} with ${trainer.display_name ?? "your trainer"}`,
              description: formatSlot(start.toISOString(), trainer.timezone),
            },
          },
        },
      ],
      payment_intent_data: {
        on_behalf_of: trainer.stripe_account_id!,
        transfer_data: { destination: trainer.stripe_account_id! },
        ...(feeBps > 0 ? { application_fee_amount: Math.round((service.price_cents * feeBps) / 10_000) } : {}),
      },
      metadata: { kind: "booking", booking_id: booking.id },
      success_url: successUrl,
      cancel_url: `${siteUrl()}/${trainer.slug}/book?service=${service.id}&cancelled=${booking.id}`,
    });

    await admin.from("bookings").update({ stripe_checkout_session_id: session.id }).eq("id", booking.id);
    return NextResponse.json({ redirectUrl: session.url });
  } catch (e) {
    console.error("checkout session failed", e);
    await admin.from("bookings").update({ status: "cancelled" }).eq("id", booking.id);
    return error("We couldn't start checkout. Please try again.", 502);
  }
}
