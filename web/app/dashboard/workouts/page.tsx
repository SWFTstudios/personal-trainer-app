import Link from "next/link";
import { prettyDate, STATUS_CLASS } from "@/components/app/WorkoutSummary";
import { Icon } from "@/components/ui/Icon";
import { relativeTime } from "@/lib/app-data";
import { all } from "@/lib/db";
import { toWorkout } from "@/lib/rows";
import { requireTrainer } from "@/lib/trainer";
import { summarize } from "@/lib/workouts";

const VIEWS = { pending: "Needs feedback", reviewed: "Reviewed", all: "All" } as const;

export default async function WorkoutsInbox({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const raw = (await searchParams).view;
  const view: keyof typeof VIEWS = raw === "reviewed" || raw === "all" ? raw : "pending";
  const trainer = await requireTrainer();
  const where = view === "pending" ? "AND w.status = 'submitted'" : view === "reviewed" ? "AND w.status = 'reviewed'" : "AND w.status <> 'logged'";
  const rows = await all<Parameters<typeof toWorkout>[0] & { member_name: string }>(
    `SELECT w.*, m.display_name AS member_name FROM workouts w JOIN members m ON m.id = w.member_id
     WHERE w.trainer_id = ? ${where} ORDER BY COALESCE(w.submitted_at, w.updated_at) ${view === "pending" ? "ASC" : "DESC"} LIMIT 200`,
    trainer.id,
  );

  return (
    <>
      <div>
        <h1 style={{ marginBottom: 4 }}>Client workouts</h1>
        <p className="muted" style={{ margin: 0 }}>Workouts your members sent for feedback. Oldest first, so nobody waits too long.</p>
      </div>
      <div className="segmented" role="navigation" aria-label="Filter">
        {(Object.keys(VIEWS) as (keyof typeof VIEWS)[]).map((v) => (
          <Link key={v} href={`/dashboard/workouts${v === "pending" ? "" : `?view=${v}`}`} aria-current={view === v ? "page" : undefined}>{VIEWS[v]}</Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <div className="empty"><Icon name="check" /><p>{view === "pending" ? "You're all caught up." : "Nothing here yet."}</p></div>
      ) : (
        <div className="list">
          {rows.map((r) => {
            const w = toWorkout(r);
            const s = summarize(w.exercises);
            return (
              <Link key={w.id} href={`/dashboard/workouts/${w.id}`} className="list-item">
                <span className="avatar">{r.member_name.slice(0, 1).toUpperCase()}</span>
                <div className="grow">
                  <strong>{r.member_name}</strong> <span className="muted">· {w.title}</span>
                  <div className="small muted">{prettyDate(w.performed_on)} · {s.sets} sets{w.effort ? ` · effort ${w.effort}/10` : ""}</div>
                </div>
                <span className={`badge ${STATUS_CLASS[w.status]}`}>{w.submitted_at ? relativeTime(w.submitted_at) : ""}</span>
                <Icon name="chevron" className="chev" />
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
