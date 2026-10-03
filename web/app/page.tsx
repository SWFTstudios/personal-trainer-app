import Link from "next/link";
import { productName } from "@/lib/env";
import { PLANS, TRIAL_DAYS } from "@/lib/plans";

export default function Home() {
  return (
    <main>
      <section className="container hero narrow">
        <p className="muted small">For independent personal trainers</p>
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)" }}>Your site, your calendar, paid up front.</h1>
        <p className="muted" style={{ fontSize: "1.15rem" }}>
          {productName} gives you a branded landing page, online booking, card payments and a client intake form
          in one link you can put in your bio. Set up in an afternoon.
        </p>
        <div className="row">
          <Link className="btn" href="/login">Start {TRIAL_DAYS}-day free trial</Link>
          <a className="btn btn-ghost" href="#pricing">See pricing</a>
        </div>
      </section>

      <section className="container" style={{ paddingBottom: 48 }}>
        <div className="grid">
          {[
            ["Landing page", "Your name, photo, bio and services on a clean page at yourname link."],
            ["Booking", "Clients pick a session and a time from your weekly availability. No back-and-forth."],
            ["Payments", "Clients pay when they book. Money goes straight to your Stripe account."],
            ["Intake", "Ask about goals, injuries and experience before the first session."],
          ].map(([title, body]) => (
            <div key={title} className="card">
              <h3>{title}</h3>
              <p className="muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="container" style={{ paddingBottom: 80 }}>
        <h2>Pricing</h2>
        <div className="grid">
          {Object.entries(PLANS).map(([key, plan]) => (
            <div key={key} className="card stack">
              <h3>{plan.name}</h3>
              <p style={{ fontSize: "2rem", fontWeight: 700, margin: 0 }}>
                ${plan.priceMonthly}<span className="muted small">/mo</span>
              </p>
              <ul className="muted">
                {plan.features.map((f) => <li key={f}>{f}</li>)}
              </ul>
              <Link className="btn" href="/login">Start free trial</Link>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
