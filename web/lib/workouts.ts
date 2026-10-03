import { z } from "zod";

export const UNITS = ["lb", "kg", "bw", "sec", "min", "m"] as const;
export type Unit = (typeof UNITS)[number];

const num = (max: number) =>
  z.union([z.number(), z.string()]).transform((v) => (v === "" || v == null ? null : Number(v))).pipe(z.number().min(0).max(max).nullable());

export const SetSchema = z.object({ reps: num(9999), weight: num(5000), unit: z.enum(UNITS) });

export const ExerciseSchema = z.object({
  name: z.string().trim().min(1, "Every exercise needs a name").max(80),
  notes: z.string().trim().max(300).default(""),
  sets: z.array(SetSchema).max(30).default([]),
});

export const WorkoutSchema = z.object({
  title: z.string().trim().min(1, "Give the workout a name").max(100),
  performed_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  duration_minutes: num(600).transform((v) => (v ? Math.round(v) : null)),
  effort: num(10).transform((v) => (v ? Math.round(v) : null)),
  notes: z.string().trim().max(2000).default(""),
  exercises: z.array(ExerciseSchema).max(40),
});

export type WorkoutSet = z.infer<typeof SetSchema>;
export type Exercise = z.infer<typeof ExerciseSchema>;
export type WorkoutInput = z.infer<typeof WorkoutSchema>;

export function summarize(exercises: Exercise[]) {
  let sets = 0;
  let volumeLb = 0;
  for (const e of exercises) {
    for (const s of e.sets) {
      sets++;
      if (s.reps && s.weight && (s.unit === "lb" || s.unit === "kg")) volumeLb += s.reps * s.weight * (s.unit === "kg" ? 2.20462 : 1);
    }
  }
  return { exercises: exercises.length, sets, volumeLb: Math.round(volumeLb) };
}

export function formatSet(s: WorkoutSet): string {
  if (s.unit === "bw") return `${s.reps ?? "–"} reps · bodyweight`;
  if (s.unit === "sec" || s.unit === "min") return `${s.weight ?? "–"} ${s.unit}${s.reps ? ` × ${s.reps}` : ""}`;
  if (s.unit === "m") return `${s.weight ?? "–"} m${s.reps ? ` × ${s.reps}` : ""}`;
  return `${s.reps ?? "–"} × ${s.weight ?? "–"} ${s.unit}`;
}

/** Consecutive ISO weeks (ending this week or last) with at least one workout. */
export function weekStreak(dates: string[], today: Date): number {
  const weekKey = (d: Date) => {
    const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7)); // Monday
    return t.getTime();
  };
  const weeks = new Set(dates.map((d) => weekKey(new Date(`${d}T00:00:00Z`))));
  const WEEK = 7 * 86_400_000;
  let cursor = weekKey(today);
  if (!weeks.has(cursor)) cursor -= WEEK;
  let streak = 0;
  while (weeks.has(cursor)) {
    streak++;
    cursor -= WEEK;
  }
  return streak;
}
