import Link from "next/link";
import { BookingsTable } from "@/components/dashboard/BookingsTable";
import { Icon } from "@/components/ui/Icon";
import { all, first } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { hasActiveSubscription } from "@/lib/plans";
import { toBooking } from "@/lib/rows";
import { requireTrainer } from "@/lib/trainer";

export default async function OverviewPage() {
  const trainer = await requireTrainer();
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const nowIso = now.toISOString();

  const [upcoming, stats, counts] = await Promise.all([
    all<Parameters<typeof toBooking>[0]>(
      "SELECT * FROM bookings WHERE trainer_id = ? AND status = 'confirmed' AND ends_at >= ? ORDER BY starts_at LIMIT 10",
      trainer.id, nowIso,
    ),
    first<{ upcoming: number; month_bookings: number; month_revenue: number; clients: number }>(
      `SELECT
         SUM(CASE WHEN status = 'confirmed' AND ends_at >= ?1 THEN 1 ELSE 0 END) AS upcoming,
         SUM(CASE WHEN status = 'confirmed' AND created_at >= ?2 THEN 1 ELSE 0 END) AS month_bookings,
         SUM(CASE WHEN status = 'confirmed' AND created_at >= ?2 THEN amount_cents ELSE 0 END) AS month_revenue,
         COUNT(DISTINCT CASE WHEN status = 'confirmed' THEN lower(client_email) END) AS clients
       FROM bookings WHERE trainer_id = ?3`,
      nowIso, monthStart, trainer.id,
    ),
    first<{ services: number; rules: number; pages: number; videos: number; members: number; pending: number }>(
      `SELECT (SELECT COUNT(*) FROM services WHERE trainer_id = ?1 AND active = 1) AS services,
              (SELECT COUNT(*) FROM availability_rules WHERE trainer_id = ?1) AS rules,
              (SELECT COUNT(*) FROM pages WHERE trainer_id = ?1 AND published = 1) AS pages,
              (SELECT COUNT(*) FROM videos WHERE trainer_id = ?1) AS videos,
              (SELECT COUNT(*) FROM members WHERE trainer_id = ?1) AS members,
              (SELECT COUNT(*) FROM workouts WHERE trainer_id = ?1 AND status = 'submitted') AS pending`,
      trainer.id,
    ),
  ]);

  const checklist = [
    { done: Boolean(trainer.slug && trainer.display_name), label: "Add your name and site link", href: "/dashboard/site" },
    { done: (counts?.services ?? 0) > 0, label: "Add a session type", href: "/dashboard/services" },
    { done: (counts?.rules ?? 0) > 0, label: "Set your weekly hours", href: "/dashboard/availability" },
    { done: (counts?.videos ?? 0) > 0, label: "Add your first video tip", href: "/dashboard/videos" },
    { done: Object.keys(trainer.social_links).length > 0, label: "Add your social channels", href: "/dashboard/site" },
    { done: hasActiveSubscription(trainer.subscription_status), label: "Start your plan", href: "/dashboard/billing" },
    { done: trainer.stripe_charges_enabled, label: "Connect Stripe to get paid", href: "/dashboard/billing" },
    { done: trainer.site_published, label: "Publish your site", href: "/dashboard/site" },
  ];

  return (
    <>
      <div>
        <p className="muted small" style={{ margin: 0 }}>Welcome back</p>
        <h1 style={{ margin: 0 }}>{trainer.display_name ?? "Overview"}</h1>
      </div>

      <div className="grid-2">
        <Link href="/dashboard/live" className="card tile">
          <span className="icon-bubble live"><Icon name="live" /></span>
          <strong>Go live</strong>
          <span className="small muted">Notify {counts?.members ?? 0} member{counts?.members === 1 ? "" : "s"}</span>
        </Link>
        <Link href="/dashboard/workouts" className="card tile">
          <span className="icon-bubble accent"><Icon name="chat" /></span>
          <strong>{counts?.pending ?? 0} to review</strong>
          <span className="small muted">Client workouts</span>
        </Link>
      </div>

      <div className="grid-2">
        {[
          ["Upcoming sessions", String(stats?.upcoming ?? 0)],
          ["Revenue this month", formatMoney(stats?.month_revenue ?? 0).replace("Free", "$0")],
          ["App members", String(counts?.members ?? 0)],
          ["Booking clients", String(stats?.clients ?? 0)],
        ].map(([label, value]) => (
          <div key={label} className="card stat-tile"><span className="stat-label">{label}</span><p className="stat">{value}</p></div>
        ))}
      </div>

      {checklist.some((c) => !c.done) && (
        <div className="card stack">
          <h2>Get set up</h2>
          <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 2 }}>
            {checklist.map((c) => (
              <li key={c.label} className={c.done ? "muted" : undefined}>
                {c.done ? <s>{c.label}</s> : <Link href={c.href}>{c.label}</Link>}
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="row spread"><h2 style={{ margin: 0 }}>Next up</h2><Link href="/dashboard/bookings" className="small">All bookings →</Link></div>
      {upcoming.length === 0 ? (
        <p className="muted">No upcoming bookings yet. Share your link to get your first one.</p>
      ) : (
        <BookingsTable bookings={upcoming.map(toBooking)} timeZone={trainer.timezone} allowCancel />
      )}
    </>
  );
}
