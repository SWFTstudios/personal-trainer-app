import Link from "next/link";
import { productName } from "@/lib/env";
import { sendMagicLink } from "./actions";

type Props = { searchParams: Promise<{ sent?: string; error?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { sent, error } = await searchParams;
  return (
    <main className="container narrow" style={{ padding: "80px 16px" }}>
      <Link href="/" className="muted small">← {productName}</Link>
      <div className="card stack" style={{ marginTop: 16 }}>
        <h1>Sign in</h1>
        {sent ? (
          <p>Check your email for a sign-in link.</p>
        ) : (
          <form action={sendMagicLink} className="stack">
            <p className="muted">New here? Enter your email and we'll set up your account.</p>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" required autoComplete="email" />
            </div>
            {error && <p className="error">Couldn't send the link. Please try again.</p>}
            <button className="btn" type="submit">Email me a sign-in link</button>
          </form>
        )}
      </div>
    </main>
  );
}
