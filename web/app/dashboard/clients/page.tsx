import { all } from "@/lib/db";
import { formatMoney, formatSlot } from "@/lib/format";
import { parseJson } from "@/lib/rows";
import { requireTrainer } from "@/lib/trainer";

type ClientRow = {
  email: string;
  name: string;
  phone: string | null;
  sessions: number;
  total_cents: number;
  first_at: string;
  last_at: string;
  next_at: string | null;
  intake: string;
};

export default async function ClientsPage() {
  const trainer = await requireTrainer();
  // One row per client email, with their latest name/phone/intake.
  const clients = await all<ClientRow>(
    `SELECT lower(b.client_email) AS email,
            (SELECT client_name FROM bookings x WHERE x.trainer_id = b.trainer_id AND lower(x.client_email) = lower(b.client_email) ORDER BY created_at DESC LIMIT 1) AS name,
            (SELECT client_phone FROM bookings x WHERE x.trainer_id = b.trainer_id AND lower(x.client_email) = lower(b.client_email) AND client_phone IS NOT NULL ORDER BY created_at DESC LIMIT 1) AS phone,
            (SELECT intake_answers FROM bookings x WHERE x.trainer_id = b.trainer_id AND lower(x.client_email) = lower(b.client_email) AND intake_answers <> '[]' ORDER BY created_at DESC LIMIT 1) AS intake,
            COUNT(*) AS sessions,
            SUM(b.amount_cents) AS total_cents,
            MIN(b.starts_at) AS first_at,
            MAX(CASE WHEN b.starts_at < ?2 THEN b.starts_at END) AS last_at,
            MIN(CASE WHEN b.starts_at >= ?2 THEN b.starts_at END) AS next_at
     FROM bookings b
     WHERE b.trainer_id = ?1 AND b.status = 'confirmed'
     GROUP BY lower(b.client_email)
     ORDER BY MAX(b.created_at) DESC
     LIMIT 500`,
    trainer.id,
    new Date().toISOString(),
  );

  return (
    <>
      <h1>Clients</h1>
      <p className="muted">Everyone who has booked with you. {clients.length > 0 && <a href="/dashboard/clients/export">Download CSV</a>}</p>
      {clients.length === 0 ? (
        <p className="muted">No clients yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Client</th><th>Sessions</th><th>Paid</th><th>Last / next</th></tr></thead>
            <tbody>
              {clients.map((c) => {
                const intake = parseJson<{ question: string; answer: string }[]>(c.intake, []);
                return (
                  <tr key={c.email}>
                    <td>
                      <strong>{c.name}</strong>
                      <div className="small muted"><a href={`mailto:${c.email}`}>{c.email}</a>{c.phone && <> · {c.phone}</>}</div>
                      {intake.length > 0 && (
                        <details className="small">
                          <summary>Latest intake</summary>
                          <dl>{intake.map((a, i) => <div key={i}><dt className="muted">{a.question}</dt><dd style={{ margin: "0 0 8px" }}>{a.answer}</dd></div>)}</dl>
                        </details>
                      )}
                    </td>
                    <td>{c.sessions}</td>
                    <td>{formatMoney(c.total_cents).replace("Free", "$0")}</td>
                    <td className="small">
                      {c.last_at ? formatSlot(c.last_at, trainer.timezone) : "—"}
                      <div className="muted">{c.next_at ? `Next: ${formatSlot(c.next_at, trainer.timezone)}` : "Nothing booked"}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
