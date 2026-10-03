import Link from "next/link";
import { notFound } from "next/navigation";
import { prettyDate, STATUS_CLASS, STATUS_LABEL, Thread, WorkoutSummary } from "@/components/app/WorkoutSummary";
import { Icon } from "@/components/ui/Icon";
import { getWorkoutThread } from "@/lib/app-data";
import { all, first } from "@/lib/db";
import { toWorkout } from "@/lib/rows";
import { requireTrainer } from "@/lib/trainer";
import { replyToWorkout } from "../../app-actions";
import { Notice } from "../../Notice";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ sent?: string }> };

export default async function WorkoutReview({ params, searchParams }: Props) {
  const { id } = await params;
  const { sent } = await searchParams;
  const trainer = await requireTrainer();
  const row = await first<Parameters<typeof toWorkout>[0] & { member_name: string }>(
    `SELECT w.*, m.display_name AS member_name FROM workouts w JOIN members m ON m.id = w.member_id
     WHERE w.id = ? AND w.trainer_id = ? AND w.status <> 'logged'`,
    id, trainer.id,
  );
  if (!row) notFound();
  const w = toWorkout(row);
  const [comments, recent] = await Promise.all([
    getWorkoutThread(w.id),
    all<{ id: string; title: string; performed_on: string }>(
      "SELECT id, title, performed_on FROM workouts WHERE member_id = ? AND id <> ? AND status <> 'logged' ORDER BY performed_on DESC LIMIT 5",
      w.member_id, w.id,
    ),
  ]);

  return (
    <>
      <Link href="/dashboard/workouts" className="row muted small" style={{ textDecoration: "none", gap: 4 }}><Icon name="back" width={18} height={18} /> Client workouts</Link>
      <div>
        <span className={`badge ${STATUS_CLASS[w.status]}`}>{STATUS_LABEL[w.status]}</span>
        <h1 style={{ margin: "8px 0 0" }}>{row.member_name}: {w.title}</h1>
        <p className="muted" style={{ margin: 0 }}>{prettyDate(w.performed_on)}</p>
      </div>
      <Notice success={sent ? `Feedback sent. ${row.member_name} has been notified.` : undefined} />
      <WorkoutSummary workout={w} />

      <section className="stack-sm">
        <h2 style={{ margin: 0 }}>Feedback</h2>
        <Thread comments={comments} viewer="trainer" />
        <form action={replyToWorkout.bind(null, w.id)} className="stack-sm">
          <label htmlFor="body" className="visually-hidden">Your feedback</label>
          <textarea id="body" name="body" rows={4} placeholder="Great depth on squats. Next week try 3×8 at +5 lb…" />
          <button className="btn btn-block"><Icon name="send" /> {w.status === "reviewed" ? "Send message" : "Send feedback"}</button>
        </form>
      </section>

      {recent.length > 0 && (
        <section className="stack-sm">
          <h2>Recent from {row.member_name}</h2>
          <div className="list">
            {recent.map((r) => (
              <Link key={r.id} href={`/dashboard/workouts/${r.id}`} className="list-item">
                <div className="grow"><strong>{r.title}</strong><div className="small muted">{prettyDate(r.performed_on)}</div></div>
                <Icon name="chevron" className="chev" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
