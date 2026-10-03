import { hasActiveSubscription, PLANS, TRIAL_DAYS } from "@/lib/plans";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTrainer } from "@/lib/trainer";
import { connectStripe, openBillingPortal, openPayoutDashboard, startSubscription } from "../actions";
import { Notice } from "../Notice";

type Props = { searchParams: Promise<{ subscribed?: string; connected?: string }> };

export default async function BillingPage({ searchParams }: Props) {
  const { subscribed, connected } = await searchParams;
  const trainer = await requireTrainer();

  // Webhooks keep this in sync; also check on return from onboarding so the trainer isn't left waiting.
  let chargesEnabled = trainer.stripe_charges_enabled;
  if (trainer.stripe_account_id && !chargesEnabled) {
    const account = await stripe().accounts.retrieve(trainer.stripe_account_id);
    if (account.charges_enabled) {
      chargesEnabled = true;
      await createAdminClient().from("trainers").update({ stripe_charges_enabled: true }).eq("id", trainer.id);
    }
  }

  const active = hasActiveSubscription(trainer.subscription_status);

  return (
    <>
      <h1>Billing & payments</h1>
      <Notice success={subscribed ? "Thanks! Your plan will show as active in a moment." : connected && chargesEnabled ? "Stripe is connected. You can take payments." : undefined} />

      <section className="card stack">
        <div className="row spread">
          <h2 style={{ margin: 0 }}>Your plan</h2>
          {active && <span className="badge badge-ok">{trainer.subscription_status === "trialing" ? "Trial" : "Active"} · {PLANS[trainer.plan ?? "starter"].name}</span>}
        </div>
        {active ? (
          <form action={openBillingPortal}><button className="btn btn-ghost">Manage plan & invoices</button></form>
        ) : (
          <>
            <p className="muted">
              {trainer.subscription_status ? `Your plan is ${trainer.subscription_status.replace(/_/g, " ")}. ` : `${TRIAL_DAYS} days free, cancel anytime. `}
              Your site goes live once a plan is active.
            </p>
            <div className="grid">
              {(Object.keys(PLANS) as (keyof typeof PLANS)[]).map((key) => (
                <form key={key} action={startSubscription.bind(null, key)} className="card stack">
                  <h3 style={{ margin: 0 }}>{PLANS[key].name} · ${PLANS[key].priceMonthly}/mo</h3>
                  <ul className="muted small" style={{ margin: 0 }}>{PLANS[key].features.map((f) => <li key={f}>{f}</li>)}</ul>
                  <button className="btn" type="submit">Choose {PLANS[key].name}</button>
                </form>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="card stack">
        <div className="row spread">
          <h2 style={{ margin: 0 }}>Getting paid</h2>
          {chargesEnabled && <span className="badge badge-ok">Connected</span>}
        </div>
        <p className="muted">
          Client payments go straight to your own Stripe account and pay out to your bank. Free sessions work without
          this.
        </p>
        {chargesEnabled ? (
          <form action={openPayoutDashboard}><button className="btn btn-ghost">Open payouts dashboard</button></form>
        ) : (
          <form action={connectStripe}>
            <button className="btn">{trainer.stripe_account_id ? "Finish Stripe setup" : "Connect Stripe"}</button>
          </form>
        )}
      </section>
    </>
  );
}
