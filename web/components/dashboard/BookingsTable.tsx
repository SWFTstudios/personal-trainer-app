import { cancelBooking } from "@/app/dashboard/actions";
import { formatMoney, formatSlot } from "@/lib/format";
import type { Booking } from "@/lib/types";

/** Bookings as stacked cards (readable on phones; no horizontal scrolling). */
export function BookingsTable({ bookings, timeZone, allowCancel }: { bookings: Booking[]; timeZone: string; allowCancel: boolean }) {
  return (
    <div className="list">
      {bookings.map((b) => (
        <div key={b.id} className="list-item" style={{ alignItems: "flex-start", opacity: b.status === "cancelled" ? 0.55 : 1 }}>
          <div className="grow stack-sm">
            <div className="row spread" style={{ gap: 8 }}>
              <strong>{b.client_name}</strong>
              <span className="badge">{formatMoney(b.amount_cents, b.currency)}</span>
            </div>
            <div className="small">{formatSlot(b.starts_at, timeZone)} · {b.service_name}{b.status === "cancelled" && " · Cancelled"}</div>
            <div className="small muted">
              <a href={`mailto:${b.client_email}`}>{b.client_email}</a>
              {b.client_phone && <> · <a href={`tel:${b.client_phone}`}>{b.client_phone}</a></>}
            </div>
            {b.intake_answers.length > 0 && (
              <details className="small">
                <summary style={{ cursor: "pointer", minHeight: 32 }}>Intake answers</summary>
                <dl style={{ margin: "4px 0 0" }}>
                  {b.intake_answers.map((a, i) => (
                    <div key={i}><dt className="muted">{a.question}</dt><dd style={{ margin: "0 0 8px" }}>{a.answer}</dd></div>
                  ))}
                </dl>
              </details>
            )}
          </div>
          {allowCancel && b.status === "confirmed" && (
            <form action={cancelBooking.bind(null, b.id)}>
              <button className="btn btn-danger btn-sm" title="Refunds are issued from your Stripe dashboard">Cancel</button>
            </form>
          )}
        </div>
      ))}
    </div>
  );
}
