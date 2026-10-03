import { cancelBooking } from "@/app/dashboard/actions";
import { formatMoney, formatSlot } from "@/lib/format";
import type { Booking } from "@/lib/types";

export function BookingsTable({ bookings, timeZone, allowCancel }: { bookings: Booking[]; timeZone: string; allowCancel: boolean }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr><th>When</th><th>Client</th><th>Session</th><th>Paid</th><th /></tr>
        </thead>
        <tbody>
          {bookings.map((b) => (
            <tr key={b.id} style={b.status === "cancelled" ? { opacity: 0.55 } : undefined}>
              <td>{formatSlot(b.starts_at, timeZone)}</td>
              <td>
                <strong>{b.client_name}</strong>
                <div className="small muted">
                  <a href={`mailto:${b.client_email}`}>{b.client_email}</a>
                  {b.client_phone && <> · {b.client_phone}</>}
                </div>
                {b.intake_answers.length > 0 && (
                  <details className="small">
                    <summary>Intake</summary>
                    <dl>
                      {b.intake_answers.map((a, i) => (
                        <div key={i}><dt className="muted">{a.question}</dt><dd style={{ margin: "0 0 8px" }}>{a.answer}</dd></div>
                      ))}
                    </dl>
                  </details>
                )}
              </td>
              <td>{b.service_name}{b.status === "cancelled" && <div className="small muted">Cancelled</div>}</td>
              <td>{formatMoney(b.amount_cents, b.currency)}</td>
              <td>
                {allowCancel && b.status === "confirmed" && (
                  <form action={cancelBooking.bind(null, b.id)}>
                    <button className="btn btn-danger btn-sm" title="Refunds are issued from your Stripe dashboard">Cancel</button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
