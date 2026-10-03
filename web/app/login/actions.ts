"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { first, isDbError, newId, run } from "@/lib/db";

const Credentials = z.object({
  email: z.email().max(200).transform((e) => e.trim().toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

// Compared against when the email is unknown, so both paths take the same time.
const DUMMY_HASH = "pbkdf2$100000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

export async function signUp(formData: FormData) {
  const parsed = Credentials.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/signup?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  const { email, password } = parsed.data;

  const userId = newId();
  try {
    await run("INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)", userId, email, await hashPassword(password));
  } catch (e) {
    if (isDbError(e, "UNIQUE constraint failed")) redirect("/login?error=" + encodeURIComponent("You already have an account. Sign in instead."));
    throw e;
  }
  await run("INSERT INTO trainers (id, user_id) VALUES (?, ?)", newId(), userId);
  await createSession(userId);
  redirect("/dashboard");
}

export async function signIn(formData: FormData) {
  const parsed = Credentials.safeParse(Object.fromEntries(formData));
  const fail = () => redirect("/login?error=" + encodeURIComponent("Wrong email or password."));
  if (!parsed.success) fail();
  const { email, password } = parsed.data!;

  const user = await first<{ id: string; password_hash: string }>("SELECT id, password_hash FROM users WHERE email = ?", email);
  const ok = await verifyPassword(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !ok) fail();
  const isTrainer = await first("SELECT id FROM trainers WHERE user_id = ?", user!.id);
  if (!isTrainer) {
    // A member account: add a trainer profile on top so the same login works for both.
    await run("INSERT INTO trainers (id, user_id) VALUES (?, ?)", newId(), user!.id);
  }
  await createSession(user!.id);
  redirect("/dashboard");
}

export async function signOut() {
  await destroySession();
  redirect("/");
}
