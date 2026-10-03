import Link from "next/link";
import { notFound } from "next/navigation";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublishedTrainer } from "@/lib/trainer";
import type { IntakeQuestion, Service } from "@/lib/types";
import { BookingFlow } from "./BookingFlow";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ service?: string; cancelled?: string }>;
};

export default async function BookPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { service: serviceId, cancelled } = await searchParams;
  const trainer = await getPublishedTrainer(slug);
  if (!trainer) notFound();

  const admin = createAdminClient();
  if (cancelled) {
    // Client backed out of checkout: close the session and free the slot right away.
    const { data: released } = await admin
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", cancelled)
      .eq("trainer_id", trainer.id)
      .eq("status", "pending_payment")
      .select("stripe_checkout_session_id")
      .maybeSingle();
    if (released?.stripe_checkout_session_id) {
      await stripe().checkout.sessions.expire(released.stripe_checkout_session_id).catch(() => undefined);
    }
  }

  const [{ data: services }, { data: questions }] = await Promise.all([
    admin.from("services").select("*").eq("trainer_id", trainer.id).eq("active", true).order("sort_order").order("created_at"),
    admin.from("intake_questions").select("*").eq("trainer_id", trainer.id).order("sort_order").order("created_at"),
  ]);

  return (
    <main className="container narrow" style={{ padding: "40px 16px" }}>
      <Link href={`/${slug}`} className="muted small">← {trainer.display_name}</Link>
      <h1 style={{ marginTop: 16 }}>Book a session</h1>
      {cancelled && <p className="notice">Checkout was cancelled and your time was released. Pick a time to try again.</p>}
      <BookingFlow
        slug={slug}
        timeZone={trainer.timezone}
        services={(services ?? []) as Service[]}
        questions={(questions ?? []) as IntakeQuestion[]}
        initialServiceId={serviceId}
      />
    </main>
  );
}
