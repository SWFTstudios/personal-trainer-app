import Link from "next/link";
import { notFound } from "next/navigation";
import { first } from "@/lib/db";
import { formatSlot } from "@/lib/format";
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

  const booking = await first<{ service_name: string; starts_at: string; status: string }>(
    "SELECT service_name, starts_at, status FROM bookings WHERE id = ? AND trainer_id = ?",
    bookingId,
    trainer.id,
  );
  if (!booking) notFound();

  const confirmed = booking.status === "confirmed";
  return (
    <main className="container narrow" style={{ padding: "64px 16px" }}>
      <div className="card stack">
        <h1>{confirmed ? "You're booked" : booking.status === "cancelled" ? "This booking was cancelled" : "Finishing up your booking"}</h1>
        <p>
          <strong>{booking.service_name}</strong> with {trainer.display_name}
          <br />
          {formatSlot(booking.starts_at, trainer.timezone)}
        </p>
        <p className="muted">
          {confirmed
            ? "Your trainer has your details. See you there."
            : booking.status === "cancelled"
              ? "Please book a new time."
              : "We're confirming your payment. This usually takes a few seconds. Refresh this page to check."}
        </p>
        <Link className="btn btn-ghost" href={`/${slug}`}>Back to {trainer.display_name}</Link>
      </div>
    </main>
  );
}
