import { Icon } from "@/components/ui/Icon";
import type { Workout, WorkoutComment } from "@/lib/types";
import { formatSet, summarize } from "@/lib/workouts";

export const STATUS_LABEL = { logged: "Not sent", submitted: "Awaiting feedback", reviewed: "Feedback ready" } as const;
export const STATUS_CLASS = { logged: "", submitted: "badge-accent", reviewed: "badge-ok" } as const;

export function prettyDate(day: string) {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

/** Read-only workout breakdown used by both the member and the trainer. */
export function WorkoutSummary({ workout: w }: { workout: Workout }) {
  const s = summarize(w.exercises);
  return (
    <div className="stack">
      <div className="grid-2" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="card card-flat"><div className="tiny muted">Exercises</div><div className="stat" style={{ fontSize: "1.3rem" }}>{s.exercises}</div></div>
        <div className="card card-flat"><div className="tiny muted">Sets</div><div className="stat" style={{ fontSize: "1.3rem" }}>{s.sets}</div></div>
        <div className="card card-flat"><div className="tiny muted">{w.effort ? "Effort" : "Minutes"}</div><div className="stat" style={{ fontSize: "1.3rem" }}>{w.effort ? `${w.effort}/10` : (w.duration_minutes ?? "—")}</div></div>
      </div>
      {w.exercises.length > 0 && (
        <div className="list">
          {w.exercises.map((e, i) => (
            <div key={i} className="list-item" style={{ alignItems: "flex-start" }}>
              <Icon name="dumbbell" />
              <div className="grow">
                <strong>{e.name}</strong>
                <ol className="small" style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                  {e.sets.map((set, j) => <li key={j}>{formatSet(set)}</li>)}
                </ol>
                {e.notes && <p className="small muted" style={{ margin: "4px 0 0" }}>{e.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
      {(w.notes || w.duration_minutes) && (
        <div className="card card-flat stack-sm">
          {w.duration_minutes && <div className="small muted"><Icon name="clock" width={16} height={16} style={{ verticalAlign: "-3px" }} /> {w.duration_minutes} minutes</div>}
          {w.notes && <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{w.notes}</p>}
        </div>
      )}
    </div>
  );
}

export function Thread({ comments, viewer }: { comments: WorkoutComment[]; viewer: "trainer" | "member" }) {
  if (comments.length === 0) return null;
  return (
    <div className="thread" aria-label="Feedback thread">
      {comments.map((c) => (
        <div key={c.id} className={`bubble ${c.author === viewer ? "mine" : "theirs"}`}>
          {c.body}
          <time dateTime={c.created_at}>{new Date(c.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</time>
        </div>
      ))}
    </div>
  );
}
