import Link from "next/link";
import { notFound } from "next/navigation";
import { formatSlot } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublishedTrainer } from "@/lib/trainer";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ booking?: string }>;
};

export default async function ConfirmedPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { booking: bookingId } = await searchParams;
  const trainer = await getPublishedTrainer(slug);
  if (!trainer || !bookingId) notFound();

  const { data: booking } = await createAdminClient()
    .from("bookings")
    .select("service_name, starts_at, status")
    .eq("id", bookingId)
    .eq("trainer_id", trainer.id)
    .maybeSingle();
  if (!booking) notFound();

  const confirmed = booking.status === "confirmed";
  return (
    <main className="container narrow" style={{ padding: "64px 16px" }}>
      <div className="card stack">
        <h1>{confirmed ? "You're booked" : "Finishing up your booking"}</h1>
        <p>
          <strong>{booking.service_name}</strong> with {trainer.display_name}
          <br />
          {formatSlot(booking.starts_at, trainer.timezone)}
        </p>
        <p className="muted">
          {confirmed
            ? "Your trainer has your details. See you there."
            : "We're confirming your payment. This usually takes a few seconds. Refresh this page to check."}
        </p>
        <Link className="btn btn-ghost" href={`/${slug}`}>Back to {trainer.display_name}</Link>
      </div>
    </main>
  );
}
