import Link from "next/link";
import { notFound } from "next/navigation";
import { prettyDate, STATUS_CLASS, STATUS_LABEL, Thread, WorkoutSummary } from "@/components/app/WorkoutSummary";
import { Icon } from "@/components/ui/Icon";
import { getWorkoutThread } from "@/lib/app-data";
import { first } from "@/lib/db";
import { requireMember } from "@/lib/member";
import { toWorkout } from "@/lib/rows";
import { commentOnWorkout, deleteWorkout, sendWorkout } from "../../../actions";

export default async function WorkoutPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const { trainer, member } = await requireMember(slug);
  const row = await first<Parameters<typeof toWorkout>[0]>("SELECT * FROM workouts WHERE id = ? AND member_id = ?", id, member.id);
  if (!row) notFound();
  const w = toWorkout(row);
  const comments = await getWorkoutThread(w.id);
  const coach = trainer.display_name ?? "your coach";
  const base = `/${trainer.slug}/app/workouts`;

  return (
    <div className="container stack page-pad">
      <Link href={base} className="row muted small" style={{ textDecoration: "none", gap: 4 }}><Icon name="back" width={18} height={18} /> Workouts</Link>
      <div>
        <span className={`badge ${STATUS_CLASS[w.status]}`}>{STATUS_LABEL[w.status]}</span>
        <h1 style={{ margin: "8px 0 0" }}>{w.title}</h1>
        <p className="muted" style={{ margin: 0 }}>{prettyDate(w.performed_on)}</p>
      </div>

      <WorkoutSummary workout={w} />

      {w.status === "logged" && (
        <form action={sendWorkout.bind(null, trainer.slug, w.id)}>
          <button className="btn btn-block"><Icon name="send" /> Send to {coach}</button>
        </form>
      )}

      {(comments.length > 0 || w.status !== "logged") && (
        <section className="stack-sm">
          <h2 style={{ margin: 0 }}>Feedback</h2>
          {comments.length === 0 && <p className="muted">Sent to {coach}. You'll get a notification when they reply.</p>}
          <Thread comments={comments} viewer="member" />
          <form action={commentOnWorkout.bind(null, trainer.slug, w.id)} className="row" style={{ flexWrap: "nowrap", alignItems: "flex-end" }}>
            <textarea name="body" rows={1} placeholder={`Message ${coach}…`} aria-label="Message" required style={{ minHeight: 48 }} />
            <button className="icon-btn" aria-label="Send" style={{ background: "var(--accent)", color: "var(--accent-text)", flex: "none", width: 48, height: 48 }}><Icon name="send" /></button>
          </form>
        </section>
      )}

      <div className="row">
        {w.status !== "reviewed" && <Link href={`${base}/${w.id}/edit`} className="btn btn-ghost btn-sm">Edit</Link>}
        <form action={deleteWorkout.bind(null, trainer.slug, w.id)}><button className="btn btn-danger btn-sm">Delete</button></form>
      </div>
    </div>
  );
}
