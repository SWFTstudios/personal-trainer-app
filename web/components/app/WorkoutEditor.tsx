"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveWorkout } from "@/app/[slug]/app/actions";
import { Icon } from "@/components/ui/Icon";
import { blankExercise, type ExerciseDraft, type SetDraft, type WorkoutDraft } from "@/lib/workout-drafts";
import { UNITS, type Unit } from "@/lib/workouts";

const TEMPLATES = ["Upper body", "Lower body", "Full body", "Push", "Pull", "Legs", "Cardio", "Mobility"];
const UNIT_LABEL: Record<Unit, string> = { lb: "lb", kg: "kg", bw: "BW", sec: "sec", min: "min", m: "m" };

export function WorkoutEditor({ slug, initial, suggestions, coach }: { slug: string; initial: WorkoutDraft; suggestions: string[]; coach: string }) {
  const router = useRouter();
  const [w, setW] = useState(initial);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const set = (patch: Partial<WorkoutDraft>) => setW((cur) => ({ ...cur, ...patch }));
  const setExercise = (k: string, patch: Partial<ExerciseDraft>) =>
    set({ exercises: w.exercises.map((e) => (e.key === k ? { ...e, ...patch } : e)) });

  function save(send: boolean) {
    setError("");
    const exercises = w.exercises
      .filter((e) => e.name.trim() || e.sets.some((s) => s.reps || s.weight))
      .map(({ name, notes, sets }) => ({ name, notes, sets: sets.filter((s) => s.reps || s.weight || s.unit === "bw") }));
    start(async () => {
      const result = await saveWorkout(slug, w.id, { ...w, exercises }, send);
      if (!result.ok) return setError(result.error);
      router.push(`/${slug}/app/workouts/${result.id}`);
      router.refresh();
    });
  }

  return (
    <div className="stack" style={{ paddingBottom: 96 }}>
      <datalist id="exercise-names">{suggestions.map((s) => <option key={s} value={s} />)}</datalist>

      <div className="stack-sm">
        <label htmlFor="w-title">Workout</label>
        <input id="w-title" value={w.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Upper body" enterKeyHint="next" />
        <div className="scroll-x">
          {TEMPLATES.map((t) => (
            <button key={t} type="button" className="chip" aria-pressed={w.title === t} onClick={() => set({ title: t })}>{t}</button>
          ))}
        </div>
      </div>

      <div className="grid-2">
        <div>
          <label htmlFor="w-date">Date</label>
          <input id="w-date" type="date" value={w.performed_on} onChange={(e) => set({ performed_on: e.target.value })} />
        </div>
        <div>
          <label htmlFor="w-dur">Minutes</label>
          <input id="w-dur" type="number" inputMode="numeric" min={1} max={600} value={w.duration_minutes} onChange={(e) => set({ duration_minutes: e.target.value })} placeholder="45" />
        </div>
      </div>

      <section className="stack-sm">
        <h2 style={{ margin: "8px 0 0" }}>Exercises</h2>
        {w.exercises.map((ex, i) => (
          <div key={ex.key} className="exercise stack-sm">
            <div className="row" style={{ flexWrap: "nowrap", gap: 6 }}>
              <input
                aria-label={`Exercise ${i + 1} name`}
                list="exercise-names"
                value={ex.name}
                onChange={(e) => setExercise(ex.key, { name: e.target.value })}
                placeholder="Exercise (e.g. Squat)"
                style={{ fontWeight: 600 }}
              />
              <button type="button" className="icon-btn" aria-label="Remove exercise" onClick={() => set({ exercises: w.exercises.filter((x) => x.key !== ex.key) })}>
                <Icon name="trash" />
              </button>
            </div>
            <div className="set-row set-head" aria-hidden="true"><span>Set</span><span>Reps</span><span>Load</span><span>Unit</span><span /></div>
            {ex.sets.map((s, j) => {
              const update = (patch: Partial<SetDraft>) => setExercise(ex.key, { sets: ex.sets.map((x, n) => (n === j ? { ...x, ...patch } : x)) });
              return (
                <div key={j} className="set-row">
                  <span className="set-n">{j + 1}</span>
                  <input aria-label={`Set ${j + 1} reps`} type="number" inputMode="numeric" min={0} value={s.reps} onChange={(e) => update({ reps: e.target.value })} placeholder="10" />
                  <input aria-label={`Set ${j + 1} load`} type="number" inputMode="decimal" min={0} step="any" value={s.unit === "bw" ? "" : s.weight} disabled={s.unit === "bw"} onChange={(e) => update({ weight: e.target.value })} placeholder={s.unit === "bw" ? "—" : "0"} />
                  <select aria-label={`Set ${j + 1} unit`} value={s.unit} onChange={(e) => update({ unit: e.target.value as Unit })}>
                    {UNITS.map((u) => <option key={u} value={u}>{UNIT_LABEL[u]}</option>)}
                  </select>
                  <button type="button" className="icon-btn" aria-label={`Remove set ${j + 1}`} style={{ width: 40, height: 40 }} disabled={ex.sets.length === 1}
                    onClick={() => setExercise(ex.key, { sets: ex.sets.filter((_, n) => n !== j) })}>
                    <Icon name="x" width={18} height={18} />
                  </button>
                </div>
              );
            })}
            <div className="row">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setExercise(ex.key, { sets: [...ex.sets, { ...ex.sets[ex.sets.length - 1] }] })}>
                <Icon name="plus" /> Add set
              </button>
            </div>
            <input aria-label="Exercise notes" value={ex.notes} onChange={(e) => setExercise(ex.key, { notes: e.target.value })} placeholder="Notes (optional) — form, pain, tempo…" />
          </div>
        ))}
        <button type="button" className="btn btn-ghost btn-block" onClick={() => set({ exercises: [...w.exercises, blankExercise("", w.exercises.at(-1)?.sets.at(-1)?.unit ?? "lb")] })}>
          <Icon name="plus" /> Add exercise
        </button>
      </section>

      <section className="stack-sm">
        <label id="effort-label">How hard was it? <span className="muted small">(1 easy – 10 max)</span></label>
        <div className="effort" role="group" aria-labelledby="effort-label">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button key={n} type="button" aria-pressed={w.effort === n} onClick={() => set({ effort: w.effort === n ? null : n })}>{n}</button>
          ))}
        </div>
      </section>

      <div>
        <label htmlFor="w-notes">Notes for {coach}</label>
        <textarea id="w-notes" rows={3} value={w.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="How did it feel? Anything you want feedback on?" />
      </div>

      {error && <p className="error" role="alert">{error}</p>}

      <div className="sticky-cta" style={{ display: "flex", gap: 8, position: "fixed", left: 0, right: 0, bottom: "calc(var(--tabbar-h) + env(safe-area-inset-bottom))", margin: 0 }}>
        <div className="container row" style={{ flexWrap: "nowrap", gap: 8 }}>
          <button type="button" className="btn btn-ghost" onClick={() => save(false)} disabled={pending}>Save</button>
          <button type="button" className="btn grow" onClick={() => save(true)} disabled={pending}>
            <Icon name="send" /> {pending ? "Sending…" : `Send to ${coach}`}
          </button>
        </div>
      </div>
    </div>
  );
}
