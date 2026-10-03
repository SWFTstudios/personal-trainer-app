import Link from "next/link";
import { productName } from "@/lib/env";

type Props = {
  mode: "login" | "signup";
  action: (formData: FormData) => Promise<void>;
  error?: string;
};

export function AuthForm({ mode, action, error }: Props) {
  const signup = mode === "signup";
  return (
    <main className="container narrow" style={{ padding: "80px 16px" }}>
      <Link href="/" className="muted small">← {productName()}</Link>
      <form action={action} className="card stack" style={{ marginTop: 16 }}>
        <h1>{signup ? "Create your account" : "Sign in"}</h1>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required minLength={8} autoComplete={signup ? "new-password" : "current-password"} />
        </div>
        {error && <p className="error">{error}</p>}
        <button className="btn" type="submit">{signup ? "Start free trial" : "Sign in"}</button>
        <p className="muted small">
          {signup ? <>Already have an account? <Link href="/login">Sign in</Link></> : <>New here? <Link href="/signup">Create an account</Link></>}
        </p>
      </form>
    </main>
  );
}
