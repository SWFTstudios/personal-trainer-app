import { describe, expect, it } from "vitest";
import { formatSet, summarize, weekStreak, WorkoutSchema } from "./workouts";

describe("WorkoutSchema", () => {
  it("coerces form strings and drops blanks", () => {
    const w = WorkoutSchema.parse({
      title: " Upper body ",
      performed_on: "2026-10-03",
      duration_minutes: "45",
      effort: "",
      notes: "",
      exercises: [{ name: "Bench press", sets: [{ reps: "8", weight: "135", unit: "lb" }, { reps: "", weight: "", unit: "bw" }] }],
    });
    expect(w).toMatchObject({ title: "Upper body", duration_minutes: 45, effort: null });
    expect(w.exercises[0].sets[0]).toEqual({ reps: 8, weight: 135, unit: "lb" });
    expect(w.exercises[0].sets[1]).toEqual({ reps: null, weight: null, unit: "bw" });
  });

  it("rejects bad input", () => {
    expect(WorkoutSchema.safeParse({ title: "", performed_on: "2026-10-03", exercises: [] }).success).toBe(false);
    expect(WorkoutSchema.safeParse({ title: "x", performed_on: "yesterday", exercises: [] }).success).toBe(false);
    expect(WorkoutSchema.safeParse({ title: "x", performed_on: "2026-10-03", effort: 11, exercises: [] }).success).toBe(false);
    expect(WorkoutSchema.safeParse({ title: "x", performed_on: "2026-10-03", exercises: [{ name: "", sets: [] }] }).success).toBe(false);
  });
});

describe("summaries", () => {
  it("counts sets and volume (kg converted to lb)", () => {
    expect(summarize([
      { name: "Squat", notes: "", sets: [{ reps: 5, weight: 100, unit: "kg" }, { reps: 5, weight: 225, unit: "lb" }] },
      { name: "Plank", notes: "", sets: [{ reps: null, weight: 60, unit: "sec" }] },
    ])).toEqual({ exercises: 2, sets: 3, volumeLb: 2227 });
    expect(formatSet({ reps: 8, weight: 135, unit: "lb" })).toBe("8 × 135 lb");
    expect(formatSet({ reps: 12, weight: null, unit: "bw" })).toBe("12 reps · bodyweight");
  });

  it("counts consecutive training weeks", () => {
    const today = new Date("2026-10-03T12:00:00Z"); // Saturday
    expect(weekStreak(["2026-10-01", "2026-09-24", "2026-09-15"], today)).toBe(3);
    expect(weekStreak(["2026-09-24", "2026-09-15"], today)).toBe(2); // nothing yet this week is fine
    expect(weekStreak(["2026-09-10"], today)).toBe(0);
  });
});
