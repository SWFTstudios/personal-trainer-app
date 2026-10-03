import type { Workout } from "@/lib/types";
import type { Unit } from "@/lib/workouts";

export type SetDraft = { reps: string; weight: string; unit: Unit };
export type ExerciseDraft = { key: string; name: string; notes: string; sets: SetDraft[] };
export type WorkoutDraft = {
  id: string | null;
  title: string;
  performed_on: string;
  duration_minutes: string;
  effort: number | null;
  notes: string;
  exercises: ExerciseDraft[];
};

const key = () => Math.random().toString(36).slice(2);

export const blankExercise = (name = "", unit: Unit = "lb"): ExerciseDraft => ({ key: key(), name, notes: "", sets: [{ reps: "", weight: "", unit }] });

export function draftFrom(w: Workout): WorkoutDraft {
  return {
    id: w.id,
    title: w.title,
    performed_on: w.performed_on,
    duration_minutes: w.duration_minutes ? String(w.duration_minutes) : "",
    effort: w.effort,
    notes: w.notes ?? "",
    exercises: w.exercises.length
      ? w.exercises.map((e) => ({
          key: key(),
          name: e.name,
          notes: e.notes,
          sets: e.sets.length ? e.sets.map((s) => ({ reps: s.reps?.toString() ?? "", weight: s.weight?.toString() ?? "", unit: s.unit })) : blankExercise().sets,
        }))
      : [blankExercise()],
  };
}

export function emptyDraft(today: string): WorkoutDraft {
  return { id: null, title: "", performed_on: today, duration_minutes: "", effort: null, notes: "", exercises: [blankExercise()] };
}

/** Previously used exercise names, most frequent first. */
export function exerciseSuggestions(workouts: Workout[]): string[] {
  const counts = new Map<string, number>();
  for (const w of workouts) for (const e of w.exercises) counts.set(e.name, (counts.get(e.name) ?? 0) + 1);
  const common = ["Squat", "Deadlift", "Bench press", "Overhead press", "Pull-up", "Row", "Lunge", "Hip thrust", "Push-up", "Plank", "Run", "Bike"];
  for (const c of common) if (!counts.has(c)) counts.set(c, 0);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n).slice(0, 60);
}
