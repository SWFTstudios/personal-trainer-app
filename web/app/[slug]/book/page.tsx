import Link from "next/link";
import { notFound } from "next/navigation";
import { getActiveServices } from "@/lib/booking";
import { all, first, run } from "@/lib/db";
import { toQuestion } from "@/lib/rows";
import { stripe } from "@/lib/stripe";
import { getPublishedTrainer } from "@/lib/trainer";
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

  if (cancelled) {
    // Client backed out of checkout: close the session and free the slot right away.
    const held = await first<{ stripe_checkout_session_id: string | null }>(
      "SELECT stripe_checkout_session_id FROM bookings WHERE id = ? AND trainer_id = ? AND status = 'pending_payment'",
      cancelled,
      trainer.id,
    );
    if (held) {
      await run("UPDATE bookings SET status = 'cancelled' WHERE id = ? AND status = 'pending_payment'", cancelled);
      if (held.stripe_checkout_session_id) {
        await stripe().checkout.sessions.expire(held.stripe_checkout_session_id).catch(() => undefined);
      }
    }
  }

  const [services, questions] = await Promise.all([
    getActiveServices(trainer.id),
    all<Parameters<typeof toQuestion>[0]>("SELECT * FROM intake_questions WHERE trainer_id = ? ORDER BY sort_order", trainer.id),
  ]);

  return (
    <main className="container narrow" style={{ padding: "40px 16px" }}>
      <Link href={`/${slug}`} className="muted small">← {trainer.display_name}</Link>
      <h1 style={{ marginTop: 16 }}>Book a session</h1>
      {cancelled && <p className="notice">Checkout was cancelled and your time was released. Pick a time to try again.</p>}
      <BookingFlow
        slug={slug}
        timeZone={trainer.timezone}
        services={services}
        questions={questions.map(toQuestion)}
        initialServiceId={serviceId}
      />
    </main>
  );
}
