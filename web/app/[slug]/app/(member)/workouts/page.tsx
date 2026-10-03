import Link from "next/link";
import { prettyDate, STATUS_CLASS, STATUS_LABEL } from "@/components/app/WorkoutSummary";
import { Icon } from "@/components/ui/Icon";
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
        <Link href={`${base}/new`} className="btn btn-sm"><Icon name="plus" /> Log</Link>
      </div>
      <div className="grid-2">
        <div className="card"><div className="muted small">This month</div><p className="stat">{thisMonth}</p></div>
        <div className="card"><div className="muted small">Week streak</div><p className="stat">{weekStreak(workouts.map((w) => w.performed_on), now)} <Icon name="flame" width={20} height={20} style={{ color: "var(--accent)", verticalAlign: "-2px" }} /></p></div>
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
                <div className="grow">
                  <strong>{w.title}</strong>
                  <div className="small muted">{prettyDate(w.performed_on)} · {s.exercises} exercises · {s.sets} sets</div>
                </div>
                <span className={`badge ${STATUS_CLASS[w.status]}`}>{STATUS_LABEL[w.status]}</span>
                <Icon name="chevron" className="chev" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
