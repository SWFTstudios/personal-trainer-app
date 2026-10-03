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

  const members = await all<{ id: string; display_name: string; email: string; created_at: string; workouts: number; last_workout: string | null; devices: number }>(
    `SELECT m.id, m.display_name, u.email, m.created_at,
            (SELECT COUNT(*) FROM workouts w WHERE w.member_id = m.id) AS workouts,
            (SELECT MAX(performed_on) FROM workouts w WHERE w.member_id = m.id) AS last_workout,
            (SELECT COUNT(*) FROM push_subscriptions p WHERE p.member_id = m.id) AS devices
     FROM members m JOIN users u ON u.id = m.user_id WHERE m.trainer_id = ? ORDER BY m.created_at DESC LIMIT 500`,
    trainer.id,
  );

  return (
    <>
      <h1 style={{ margin: 0 }}>Clients & members</h1>

      <section className="stack-sm">
        <div className="row spread">
          <h2 style={{ margin: 0 }}>App members <span className="muted">({members.length})</span></h2>
          {trainer.slug && <a className="small" href={`/${trainer.slug}/app/join`} target="_blank">Invite link</a>}
        </div>
        {members.length === 0 ? (
          <p className="muted">Share <strong>/{trainer.slug ?? "your-link"}/app</strong> with clients so they can watch your videos, get live alerts and log workouts.</p>
        ) : (
          <div className="list">
            {members.map((m) => (
              <div key={m.id} className="list-item">
                <span className="avatar">{m.display_name.slice(0, 1).toUpperCase()}</span>
                <div className="grow">
                  <strong>{m.display_name}</strong>
                  <div className="small muted"><a href={`mailto:${m.email}`}>{m.email}</a></div>
                  <div className="tiny muted">{m.workouts} workouts{m.last_workout ? ` · last ${m.last_workout}` : ""} · alerts {m.devices > 0 ? "on" : "off"}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="stack-sm">
        <div className="row spread">
          <h2 style={{ margin: 0 }}>Booking clients <span className="muted">({clients.length})</span></h2>
          {clients.length > 0 && <a className="small" href="/dashboard/clients/export">Download CSV</a>}
        </div>
        {clients.length === 0 ? (
          <p className="muted">No bookings yet.</p>
        ) : (
          <div className="list">
            {clients.map((c) => {
              const intake = parseJson<{ question: string; answer: string }[]>(c.intake, []);
              return (
                <div key={c.email} className="list-item" style={{ alignItems: "flex-start" }}>
                  <span className="avatar">{c.name.slice(0, 1).toUpperCase()}</span>
                  <div className="grow">
                    <div className="row spread" style={{ gap: 8 }}>
                      <strong>{c.name}</strong>
                      <span className="badge">{c.sessions} sessions · {formatMoney(c.total_cents).replace("Free", "$0")}</span>
                    </div>
                    <div className="small muted"><a href={`mailto:${c.email}`}>{c.email}</a>{c.phone && <> · <a href={`tel:${c.phone}`}>{c.phone}</a></>}</div>
                    <div className="tiny muted">{c.next_at ? `Next: ${formatSlot(c.next_at, trainer.timezone)}` : c.last_at ? `Last: ${formatSlot(c.last_at, trainer.timezone)}` : ""}</div>
                    {intake.length > 0 && (
                      <details className="small">
                        <summary style={{ cursor: "pointer", minHeight: 32 }}>Latest intake</summary>
                        <dl>{intake.map((a, i) => <div key={i}><dt className="muted">{a.question}</dt><dd style={{ margin: "0 0 8px" }}>{a.answer}</dd></div>)}</dl>
                      </details>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
