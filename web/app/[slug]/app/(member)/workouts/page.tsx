import Link from "next/link";
import { prettyDate, STATUS_CLASS, STATUS_LABEL } from "@/components/app/WorkoutSummary";
import { Icon } from "@/components/ui/Icon";
import { Ring } from "@/components/ui/Ring";
import { getMemberWorkouts } from "@/lib/app-data";
import { requireMember } from "@/lib/member";
import { summarize, weekStreak } from "@/lib/workouts";

export default async function WorkoutsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { trainer, member } = await requireMember(slug);
  const workouts = await getMemberWorkouts(member.id);
  const base = `/${trainer.slug}/app/workouts`;
  const now = new Date();
  const monthStart = now.toISOString().slice(0, 8) + "01";
  const thisMonth = workouts.filter((w) => w.performed_on >= monthStart).length;

  return (
    <div className="container stack page-pad">
      <div className="row spread">
        <h1 style={{ margin: 0 }}>Workouts</h1>
        <Link href={`${base}/new`} className="btn btn-ink btn-sm"><Icon name="plus" /> Log</Link>
      </div>
      <div className="grid-2">
        <div className="card stat-tile"><span className="icon-bubble accent"><Icon name="calendar" /></span><span className="stat-label">This month</span><p className="stat">{thisMonth}<small>workouts</small></p></div>
        <div className="card stat-tile"><span className="icon-bubble accent"><Icon name="flame" /></span><span className="stat-label">Streak</span><p className="stat">{weekStreak(workouts.map((w) => w.performed_on), now)}<small>weeks</small></p></div>
      </div>
      {workouts.length === 0 ? (
        <div className="empty card">
          <Icon name="dumbbell" />
          <p>Log your first workout and send it to {trainer.display_name} for feedback.</p>
          <Link href={`${base}/new`} className="btn">Log a workout</Link>
        </div>
      ) : (
        <div className="list">
          {workouts.map((w) => {
            const s = summarize(w.exercises);
            return (
              <Link key={w.id} href={`${base}/${w.id}`} className="list-item">
                <span className="list-thumb"><Icon name="dumbbell" /></span>
                <div className="grow">
                  <strong>{w.title}</strong>
                  <div className="small muted">{prettyDate(w.performed_on)} · {s.exercises} exercises</div>
                  <span className={`badge ${STATUS_CLASS[w.status]}`} style={{ marginTop: 6 }}>{STATUS_LABEL[w.status]}</span>
                </div>
                <Ring value={w.duration_minutes ?? s.sets} max={w.duration_minutes ? 60 : 20} size={54} stroke={4} label={w.duration_minutes ? `${w.duration_minutes} minutes` : `${s.sets} sets`}>
                  <strong>{w.duration_minutes ?? s.sets}</strong>
                  <span>{w.duration_minutes ? "min" : "sets"}</span>
                </Ring>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
