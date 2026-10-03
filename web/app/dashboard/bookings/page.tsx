import Link from "next/link";
import { BookingsTable } from "@/components/dashboard/BookingsTable";
import { all } from "@/lib/db";
import { toBooking } from "@/lib/rows";
import { requireTrainer } from "@/lib/trainer";

type Props = { searchParams: Promise<{ view?: string }> };

export default async function BookingsPage({ searchParams }: Props) {
  const past = (await searchParams).view === "past";
  const trainer = await requireTrainer();
  const now = new Date().toISOString();
  const rows = await all<Parameters<typeof toBooking>[0]>(
    past
      ? "SELECT * FROM bookings WHERE trainer_id = ? AND status <> 'pending_payment' AND ends_at < ? ORDER BY starts_at DESC LIMIT 200"
      : "SELECT * FROM bookings WHERE trainer_id = ? AND status <> 'pending_payment' AND ends_at >= ? ORDER BY starts_at LIMIT 200",
    trainer.id,
    now,
  );
  return (
    <>
      <h1>Bookings</h1>
      <div className="row">
        <Link className="chip" aria-pressed={!past} href="/dashboard/bookings" style={{ textDecoration: "none" }}>Upcoming</Link>
        <Link className="chip" aria-pressed={past} href="/dashboard/bookings?view=past" style={{ textDecoration: "none" }}>Past</Link>
      </div>
      {rows.length === 0 ? <p className="muted">Nothing here yet.</p> : <BookingsTable bookings={rows.map(toBooking)} timeZone={trainer.timezone} allowCancel={!past} />}
    </>
  );
}
