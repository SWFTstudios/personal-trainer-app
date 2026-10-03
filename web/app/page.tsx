import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/Icon";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { productName } from "@/lib/env";
import { PLANS, TRIAL_DAYS } from "@/lib/plans";

const FEATURES: [IconName, string, string][] = [
  ["palette", "Your brand, everywhere", "Your colors, logo and fonts on a website and an app your clients install on their phone. Light and dark mode."],
  ["video", "Your video library", "Upload videos or pull them in from YouTube, Vimeo, TikTok and Instagram. Organize them into programs."],
  ["live", "Live alerts", "Going live on Instagram or YouTube? One tap sends a push notification to every client."],
  ["dumbbell", "Workout check-ins", "Clients log workouts and send them to you. Reply with feedback and they get notified."],
  ["calendar", "Booking & payments", "Clients book sessions from your hours and pay up front. Money goes to your Stripe account."],
  ["file", "Website builder", "Drag-and-drop pages, a blog and an intake form. No designer needed."],
];

export default function Home() {
  return (
    <main>
      <header className="container row spread" style={{ paddingTop: "calc(16px + env(safe-area-inset-top))" }}>
        <strong>{productName()}</strong>
        <div className="row" style={{ gap: 4 }}>
          <ThemeToggle compact />
          <Link href="/login" className="btn btn-ghost btn-sm">Sign in</Link>
        </div>
      </header>

      <section className="container hero narrow">
        <p className="badge badge-accent" style={{ marginBottom: 16 }}>For independent personal trainers</p>
        <h1>Your own fitness app, website and booking, under your brand.</h1>
        <p className="muted" style={{ fontSize: "1.15rem" }}>
          Clients watch your tips, get notified when you go live, log workouts for your feedback and book sessions,
          all in an app with your name on it. Set up in an afternoon.
        </p>
        <div className="row">
          <Link className="btn" href="/signup">Start {TRIAL_DAYS}-day free trial</Link>
          <a className="btn btn-ghost" href="#pricing">See pricing</a>
        </div>
      </section>

      <section className="container" style={{ paddingBottom: 48 }}>
        <div className="grid">
          {FEATURES.map(([icon, title, body]) => (
            <div key={title} className="card stack-sm">
              <span className="avatar"><Icon name={icon} width={20} height={20} /></span>
              <h3 style={{ margin: 0 }}>{title}</h3>
              <p className="muted" style={{ margin: 0 }}>{body}</p>
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
              <p className="stat" style={{ fontSize: "2.2rem" }}>${plan.priceMonthly}<span className="muted small">/mo</span></p>
              <ul className="muted" style={{ paddingLeft: 20, margin: 0 }}>
                {plan.features.map((f) => <li key={f}>{f}</li>)}
              </ul>
              <Link className="btn" href="/signup">Start free trial</Link>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
