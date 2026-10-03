"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession, getUser } from "@/lib/auth/session";
import { first, isDbError, newId, nowIso, run } from "@/lib/db";
import { getMembership, requireMember } from "@/lib/member";
import { getPublishedTrainer } from "@/lib/trainer";
import { WorkoutSchema } from "@/lib/workouts";

export type Result = { ok: true; id?: string } | { ok: false; error: string };

const DUMMY_HASH = "pbkdf2$100000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

const JoinForm = z.object({
  name: z.string().trim().max(80).optional(),
  email: z.email("Enter a valid email").max(200).transform((e) => e.trim().toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

async function ensureMember(trainerId: string, userId: string, name: string) {
  try {
    await run("INSERT INTO members (id, trainer_id, user_id, display_name) VALUES (?, ?, ?, ?)", newId(), trainerId, userId, name);
  } catch (e) {
    if (!isDbError(e, "UNIQUE constraint failed")) throw e;
  }
}

/** Create an account (or sign in to an existing one) and join this trainer's app. */
export async function joinApp(slug: string, mode: "join" | "signin", formData: FormData) {
  const trainer = await getPublishedTrainer(slug);
  if (!trainer) redirect("/");
  const back = (msg: string) => redirect(`/${trainer.slug}/app/join?mode=${mode}&error=${encodeURIComponent(msg)}`);

  const parsed = JoinForm.safeParse(Object.fromEntries(formData));
  if (!parsed.success) back(parsed.error.issues[0].message);
  const { email, password, name } = parsed.data!;

  const existing = await first<{ id: string; password_hash: string }>("SELECT id, password_hash FROM users WHERE email = ?", email);
  let userId: string;
  if (existing || mode === "signin") {
    const ok = await verifyPassword(password, existing?.password_hash ?? DUMMY_HASH);
    if (!existing || !ok) back(mode === "join" ? "You already have an account. Sign in with your password." : "Wrong email or password.");
    userId = existing!.id;
  } else {
    if (!name) back("Enter your name.");
    userId = newId();
    await run("INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)", userId, email, await hashPassword(password));
  }
  await ensureMember(trainer.id, userId, name || email.split("@")[0]);
  await createSession(userId);
  redirect(`/${trainer.slug}/app`);
}

/** Signed in already (e.g. member of another coach): join with one tap. */
export async function joinAsCurrentUser(slug: string, formData: FormData) {
  const trainer = await getPublishedTrainer(slug);
  const user = await getUser();
  if (!trainer || !user) redirect(`/${slug}/app/join`);
  const name = String(formData.get("name") ?? "").trim().slice(0, 80) || user.email.split("@")[0];
  await ensureMember(trainer.id, user.id, name);
  redirect(`/${trainer.slug}/app`);
}

export async function signOutMember(slug: string) {
  await destroySession();
  redirect(`/${slug}/app/join?mode=signin`);
}

export async function updateProfile(slug: string, formData: FormData) {
  const { member } = await requireMember(slug);
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  if (name) await run("UPDATE members SET display_name = ? WHERE id = ?", name, member.id);
  revalidatePath(`/${slug}/app`, "layout");
}

// ---------------------------------------------------------------------------
// Workouts
// ---------------------------------------------------------------------------

export async function saveWorkout(slug: string, id: string | null, input: unknown, send: boolean): Promise<Result> {
  const { trainer, member } = await requireMember(slug);
  const parsed = WorkoutSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue.message };
  }
  const w = parsed.data;
  const exercises = JSON.stringify(w.exercises);
  const now = nowIso();

  let workoutId = id;
  if (workoutId) {
    const existing = await first<{ status: string }>("SELECT status FROM workouts WHERE id = ? AND member_id = ?", workoutId, member.id);
    if (!existing) return { ok: false, error: "Workout not found." };
    if (existing.status === "reviewed") return { ok: false, error: "Your coach already reviewed this workout." };
    await run(
      `UPDATE workouts SET title = ?, performed_on = ?, duration_minutes = ?, effort = ?, notes = ?, exercises = ?, updated_at = ?
       WHERE id = ? AND member_id = ?`,
      w.title, w.performed_on, w.duration_minutes, w.effort, w.notes || null, exercises, now, workoutId, member.id,
    );
  } else {
    workoutId = newId();
    await run(
      `INSERT INTO workouts (id, member_id, trainer_id, title, performed_on, duration_minutes, effort, notes, exercises)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      workoutId, member.id, trainer.id, w.title, w.performed_on, w.duration_minutes, w.effort, w.notes || null, exercises,
    );
  }
  if (send) await submit(workoutId, member.id);
  revalidatePath(`/${slug}/app`, "layout");
  return { ok: true, id: workoutId };
}

async function submit(workoutId: string, memberId: string) {
  await run(
    "UPDATE workouts SET status = 'submitted', submitted_at = COALESCE(submitted_at, ?) WHERE id = ? AND member_id = ? AND status = 'logged'",
    nowIso(), workoutId, memberId,
  );
}

export async function sendWorkout(slug: string, id: string) {
  const { member } = await requireMember(slug);
  await submit(id, member.id);
  revalidatePath(`/${slug}/app`, "layout");
}

export async function deleteWorkout(slug: string, id: string) {
  const { member } = await requireMember(slug);
  await run("DELETE FROM workouts WHERE id = ? AND member_id = ?", id, member.id);
  revalidatePath(`/${slug}/app`, "layout");
  redirect(`/${slug}/app/workouts`);
}

export async function commentOnWorkout(slug: string, id: string, formData: FormData) {
  const { member } = await requireMember(slug);
  const body = String(formData.get("body") ?? "").trim().slice(0, 2000);
  if (!body) return;
  const owned = await first("SELECT id FROM workouts WHERE id = ? AND member_id = ?", id, member.id);
  if (!owned) return;
  await run("INSERT INTO workout_comments (id, workout_id, author, body) VALUES (?, ?, 'member', ?)", newId(), id, body);
  // A follow-up question puts it back in the coach's queue.
  await run("UPDATE workouts SET status = 'submitted', submitted_at = COALESCE(submitted_at, ?), updated_at = ? WHERE id = ?", nowIso(), nowIso(), id);
  revalidatePath(`/${slug}/app/workouts/${id}`);
}

// ---------------------------------------------------------------------------
// Push subscriptions
// ---------------------------------------------------------------------------

const Subscription = z.object({
  endpoint: z.url().max(1000).refine((u) => u.startsWith("https://"), "Push endpoint must be https"),
  keys: z.object({ p256dh: z.string().min(80).max(200), auth: z.string().min(16).max(64) }),
});

export async function savePushSubscription(slug: string, subscription: unknown): Promise<Result> {
  const trainer = await getPublishedTrainer(slug);
  const member = trainer ? await getMembership(trainer.id) : null;
  if (!member) return { ok: false, error: "Sign in first." };
  const parsed = Subscription.safeParse(subscription);
  if (!parsed.success) return { ok: false, error: "This browser returned an invalid subscription." };
  const { endpoint, keys } = parsed.data;
  await run(
    `INSERT INTO push_subscriptions (id, member_id, endpoint, p256dh, auth) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(endpoint) DO UPDATE SET member_id = excluded.member_id, p256dh = excluded.p256dh, auth = excluded.auth`,
    newId(), member.id, endpoint, keys.p256dh, keys.auth,
  );
  return { ok: true };
}

export async function removePushSubscription(slug: string, endpoint: string): Promise<Result> {
  const trainer = await getPublishedTrainer(slug);
  const member = trainer ? await getMembership(trainer.id) : null;
  if (member) await run("DELETE FROM push_subscriptions WHERE endpoint = ? AND member_id = ?", endpoint, member.id);
  return { ok: true };
}
