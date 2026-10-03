import Link from "next/link";
import { redirect } from "next/navigation";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { getUser } from "@/lib/auth/session";
import { getMembership } from "@/lib/member";
import { getPublishedTrainer } from "@/lib/trainer";
import { joinApp, joinAsCurrentUser } from "../actions";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ mode?: string; error?: string }> };

export default async function JoinPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { mode: rawMode, error } = await searchParams;
  const trainer = await getPublishedTrainer(slug);
  if (!trainer) redirect("/");
  if (await getMembership(trainer.id)) redirect(`/${trainer.slug}/app`);
  const user = await getUser();
  const mode = rawMode === "signin" ? "signin" : "join";
  const coach = trainer.display_name ?? "your coach";

  return (
    <main className="container narrow" style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "calc(24px + env(safe-area-inset-top)) 16px calc(24px + env(safe-area-inset-bottom))" }}>
      <div className="row spread" style={{ marginBottom: 24 }}>
        <Link href={`/${trainer.slug}`} className="topbar-title">
          {trainer.logo_url && <img className="logo" src={trainer.logo_url} alt="" />}
          <span>{trainer.display_name}</span>
        </Link>
        <ThemeToggle compact />
      </div>
      <h1>{mode === "join" ? `Train with ${coach}` : "Welcome back"}</h1>
      <p className="muted">Watch tips, get alerts when {coach} goes live, and log workouts for feedback.</p>

      {user ? (
        <form action={joinAsCurrentUser.bind(null, trainer.slug)} className="card stack">
          <p style={{ margin: 0 }}>Signed in as <strong>{user.email}</strong></p>
          <div>
            <label htmlFor="name">Your name</label>
            <input id="name" name="name" autoComplete="name" required />
          </div>
          <button className="btn btn-block">Join {coach}'s app</button>
        </form>
      ) : (
        <form action={joinApp.bind(null, trainer.slug, mode)} className="stack">
          <div className="segmented" style={{ alignSelf: "flex-start" }}>
            <Link href="?mode=join" aria-current={mode === "join" ? "page" : undefined}>Create account</Link>
            <Link href="?mode=signin" aria-current={mode === "signin" ? "page" : undefined}>Sign in</Link>
          </div>
          {mode === "join" && (
            <div>
              <label htmlFor="name">Your name</label>
              <input id="name" name="name" autoComplete="name" required />
            </div>
          )}
          <div>
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" inputMode="email" required />
          </div>
          <div>
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" minLength={8} autoComplete={mode === "join" ? "new-password" : "current-password"} required />
          </div>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn btn-block">{mode === "join" ? "Create account" : "Sign in"}</button>
        </form>
      )}
    </main>
  );
}
