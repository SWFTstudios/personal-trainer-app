import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { all, first } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { hasActiveSubscription, PLANS } from "@/lib/plans";
import type { Plan } from "@/lib/types";

type Row = {
  id: string;
  email: string;
  slug: string | null;
  display_name: string | null;
  plan: Plan | null;
  subscription_status: string | null;
  site_published: number;
  stripe_charges_enabled: number;
  created_at: string;
  bookings: number;
  gmv_cents: number;
};

export default async function AdminPage() {
  await requireAdmin();
  const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString();
  const [trainers, month] = await Promise.all([
    all<Row>(
      `SELECT t.id, u.email, t.slug, t.display_name, t.plan, t.subscription_status, t.site_published, t.stripe_charges_enabled, t.created_at,
              COUNT(b.id) AS bookings, COALESCE(SUM(b.amount_cents), 0) AS gmv_cents
       FROM trainers t JOIN users u ON u.id = t.user_id
       LEFT JOIN bookings b ON b.trainer_id = t.id AND b.status = 'confirmed'
       GROUP BY t.id ORDER BY t.created_at DESC LIMIT 1000`,
    ),
    first<{ bookings: number; gmv: number; signups: number }>(
      `SELECT (SELECT COUNT(*) FROM bookings WHERE status = 'confirmed' AND created_at >= ?1) AS bookings,
              (SELECT COALESCE(SUM(amount_cents), 0) FROM bookings WHERE status = 'confirmed' AND created_at >= ?1) AS gmv,
              (SELECT COUNT(*) FROM trainers WHERE created_at >= ?1) AS signups`,
      monthStart,
    ),
  ]);

  const paying = trainers.filter((t) => t.subscription_status === "active");
  const trialing = trainers.filter((t) => t.subscription_status === "trialing");
  const mrr = paying.reduce((sum, t) => sum + PLANS[t.plan ?? "starter"].priceMonthly, 0);

  return (
    <main className="container" style={{ padding: "32px 16px" }}>
      <div className="row spread"><h1 style={{ margin: 0 }}>Platform admin</h1><Link href="/dashboard">← Dashboard</Link></div>
      <div className="grid" style={{ marginTop: 16 }}>
        {[
          ["MRR", `$${mrr.toLocaleString()}`],
          ["Paying trainers", String(paying.length)],
          ["In trial", String(trialing.length)],
          ["Signups this month", String(month?.signups ?? 0)],
          ["Bookings this month", String(month?.bookings ?? 0)],
          ["Client payments this month", formatMoney(month?.gmv ?? 0).replace("Free", "$0")],
        ].map(([label, value]) => (
          <div key={label} className="card"><p className="muted small" style={{ margin: 0 }}>{label}</p><p className="stat">{value}</p></div>
        ))}
      </div>
      <h2 style={{ marginTop: 32 }}>Trainers</h2>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Trainer</th><th>Plan</th><th>Site</th><th>Stripe</th><th>Bookings</th><th>Client payments</th><th>Joined</th></tr></thead>
          <tbody>
            {trainers.map((t) => {
              const live = t.slug && t.site_published && hasActiveSubscription(t.subscription_status);
              return (
                <tr key={t.id}>
                  <td><strong>{t.display_name ?? "—"}</strong><div className="small muted">{t.email}</div></td>
                  <td>{t.plan ? PLANS[t.plan].name : "—"}<div className="small muted">{t.subscription_status ?? "no plan"}</div></td>
                  <td>{live ? <a href={`/${t.slug}`} target="_blank">/{t.slug}</a> : <span className="muted">{t.slug ? "not live" : "—"}</span>}</td>
                  <td>{t.stripe_charges_enabled ? "✓" : "—"}</td>
                  <td>{t.bookings}</td>
                  <td>{formatMoney(t.gmv_cents).replace("Free", "$0")}</td>
                  <td className="small">{new Date(t.created_at).toLocaleDateString("en-US", { dateStyle: "medium" })}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
