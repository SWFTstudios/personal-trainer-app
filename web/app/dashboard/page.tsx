import Link from "next/link";
import { formatMoney, formatSlot } from "@/lib/format";
import { hasActiveSubscription } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import { requireTrainer } from "@/lib/trainer";
import type { Booking } from "@/lib/types";
import { cancelBooking } from "./actions";

export default async function BookingsPage() {
  const trainer = await requireTrainer();
  const supabase = await createClient();
  const [{ data: bookings }, { count: serviceCount }, { count: ruleCount }] = await Promise.all([
    supabase
      .from("bookings")
      .select("*")
      .eq("trainer_id", trainer.id)
      .eq("status", "confirmed")
      .gte("ends_at", new Date().toISOString())
      .order("starts_at")
      .limit(100),
    supabase.from("services").select("id", { count: "exact", head: true }).eq("trainer_id", trainer.id).eq("active", true),
    supabase.from("availability_rules").select("id", { count: "exact", head: true }).eq("trainer_id", trainer.id),
  ]);

  const checklist = [
    { done: Boolean(trainer.slug && trainer.display_name), label: "Add your name and site link", href: "/dashboard/site" },
    { done: (serviceCount ?? 0) > 0, label: "Add a session type", href: "/dashboard/services" },
    { done: (ruleCount ?? 0) > 0, label: "Set your weekly hours", href: "/dashboard/availability" },
    { done: hasActiveSubscription(trainer.subscription_status), label: "Start your plan", href: "/dashboard/billing" },
    { done: trainer.stripe_charges_enabled, label: "Connect Stripe to get paid", href: "/dashboard/billing" },
    { done: trainer.site_published, label: "Publish your site", href: "/dashboard/site" },
  ];
  const remaining = checklist.filter((c) => !c.done);

  return (
    <>
      {remaining.length > 0 && (
        <div className="card stack">
          <h2>Get set up</h2>
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            {checklist.map((c) => (
              <li key={c.label} className={c.done ? "muted" : undefined}>
                {c.done ? <s>{c.label}</s> : <Link href={c.href}>{c.label}</Link>}
              </li>
            ))}
          </ol>
        </div>
      )}

      <h1>Upcoming bookings</h1>
      {(bookings ?? []).length === 0 ? (
        <p className="muted">No upcoming bookings yet. Share your link to get your first one.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>When</th><th>Client</th><th>Session</th><th>Paid</th><th /></tr>
            </thead>
            <tbody>
              {(bookings as Booking[]).map((b) => (
                <tr key={b.id}>
                  <td>{formatSlot(b.starts_at, trainer.timezone)}</td>
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
                  <td>{b.service_name}</td>
                  <td>{formatMoney(b.amount_cents, b.currency)}</td>
                  <td>
                    <form action={cancelBooking.bind(null, b.id)}>
                      <button className="btn btn-danger btn-sm" title="Refunds are issued from your Stripe dashboard">Cancel</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
