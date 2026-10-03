import Link from "next/link";
import { PushToggle } from "@/components/app/PushToggle";
import { VideoCard } from "@/components/app/VideoCard";
import { Icon } from "@/components/ui/Icon";
import { Ring } from "@/components/ui/Ring";
import { getCurrentLive, getMemberNotifications, getMemberWorkouts, getVideos, relativeTime } from "@/lib/app-data";
import { getActiveServices } from "@/lib/booking";
import { requireMember } from "@/lib/member";
import { vapidKeys } from "@/lib/notify";
import { LIVE_LABELS, SOCIAL_LABELS } from "@/lib/social";
import { weekStreak } from "@/lib/workouts";

const WEEKLY_GOAL = 4;

/** Monday-start week containing `today`, as YYYY-MM-DD strings. */
function weekDays(today: Date) {
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    return d;
  });
}

export default async function MemberHome({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { trainer, member } = await requireMember(slug);
  const base = `/${trainer.slug}/app`;
  const now = new Date();

  const [live, videos, workouts, notes, services] = await Promise.all([
    getCurrentLive(trainer.id, now),
    getVideos(trainer.id, { limit: 8 }),
    getMemberWorkouts(member.id, 120),
    getMemberNotifications(trainer.id, member.id, 3),
    getActiveServices(trainer.id),
  ]);

  const days = weekDays(now);
  const todayKey = now.toISOString().slice(0, 10);
  const weekStart = days[0].toISOString().slice(0, 10);
  const loggedDays = new Set(workouts.map((w) => w.performed_on));
  const thisWeek = workouts.filter((w) => w.performed_on >= weekStart);
  const minutes = thisWeek.reduce((n, w) => n + (w.duration_minutes ?? 0), 0);
  const streak = weekStreak(workouts.map((w) => w.performed_on), now);
  const newFeedback = workouts.filter((w) => w.status === "reviewed" && w.reviewed_at && w.reviewed_at > member.notifications_seen_at).length;
  const lastWorkout = workouts[0];
  const firstName = member.display_name.split(" ")[0];
  const announcements = notes.filter((n) => n.kind === "announcement");
  const socials = Object.entries(trainer.social_links).filter(([, u]) => u) as [keyof typeof SOCIAL_LABELS, string][];
  const coach = trainer.display_name ?? "Your coach";

  return (
    <div className="container stack-lg page-pad">
      <div>
        <p className="eyebrow" style={{ margin: 0 }}>{now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
        <h1 style={{ margin: "2px 0 0" }}>Hi {firstName}, ready to move?</h1>
      </div>

      {live && (
        <a className="live-banner" href={live.url} target="_blank" rel="noopener noreferrer">
          {live.status === "live" ? <span className="live-dot" /> : <span className="icon-bubble live"><Icon name="calendar" /></span>}
          <div className="grow">
            <strong>{live.status === "live" ? `${coach} is live now` : "Upcoming live session"}</strong>
            <div className="small muted">
              {live.title} · {LIVE_LABELS[live.platform]}
              {live.status === "scheduled" && ` · ${new Date(live.starts_at).toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" })}`}
            </div>
          </div>
          <span className={`badge ${live.status === "live" ? "badge-live" : ""}`}>{live.status === "live" ? "Watch" : "Soon"}</span>
        </a>
      )}

      <section>
        <div className="section-head">
          <h2>This week</h2>
          <span className="small muted">{days[0].toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })} – {days[6].toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}</span>
        </div>
        <div className="week">
          {days.map((d) => {
            const key = d.toISOString().slice(0, 10);
            return (
              <div key={key} className={`day${key === todayKey ? " today" : ""}${loggedDays.has(key) ? " done" : ""}`} aria-label={`${d.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" })}${loggedDays.has(key) ? ", workout logged" : ""}`}>
                <small>{d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })}</small>
                <strong>{d.getUTCDate()}</strong>
                <i />
              </div>
            );
          })}
        </div>
        <Link href={lastWorkout ? `${base}/workouts/${lastWorkout.id}` : `${base}/workouts/new`} className="list-item" style={{ marginTop: 12 }}>
          <span className="icon-bubble"><Icon name="dumbbell" /></span>
          <div className="grow">
            <strong>{lastWorkout ? lastWorkout.title : "Log your first workout"}</strong>
            <div className="small muted">
              {lastWorkout
                ? `${lastWorkout.exercises.length} exercises${lastWorkout.duration_minutes ? ` · ${lastWorkout.duration_minutes} min` : ""}`
                : `Send it to ${coach} for feedback`}
            </div>
          </div>
          {lastWorkout?.performed_on === todayKey ? <span className="badge badge-ok">Today</span> : null}
          <span className="icon-btn ink" aria-hidden="true" style={{ width: 42, height: 42 }}><Icon name={lastWorkout ? "arrow" : "plus"} /></span>
        </Link>
      </section>

      <section className="grid-2">
        <div className="card" style={{ display: "flex", alignItems: "center", gap: 14, gridColumn: "1 / -1" }}>
          <Ring value={thisWeek.length} max={WEEKLY_GOAL} size={84} stroke={8} label={`${thisWeek.length} of ${WEEKLY_GOAL} workouts this week`}>
            <strong>{thisWeek.length}/{WEEKLY_GOAL}</strong>
            <span>workouts</span>
          </Ring>
          <div className="grow">
            <div className="stat-label">Weekly goal</div>
            <p className="stat" style={{ fontSize: "1.35rem" }}>
              {thisWeek.length >= WEEKLY_GOAL ? "Goal reached 🎉" : `${WEEKLY_GOAL - thisWeek.length} to go`}
            </p>
            <div className="small muted">{minutes ? `${minutes} active minutes` : "Every session counts"}</div>
          </div>
        </div>
        <div className="card stat-tile">
          <span className="icon-bubble accent"><Icon name="flame" /></span>
          <span className="stat-label">Streak</span>
          <p className="stat">{streak}<small>{streak === 1 ? "week" : "weeks"}</small></p>
        </div>
        <Link href={`${base}/workouts`} className="card stat-tile">
          <span className="icon-bubble accent"><Icon name="chat" /></span>
          <span className="stat-label">Feedback</span>
          <p className="stat">{newFeedback}<small>new</small></p>
        </Link>
      </section>

      <PushToggle slug={trainer.slug} vapidKey={vapidKeys()?.publicKey ?? null} coach={coach} variant="card" />

      {videos.length > 0 && (
        <section>
          <div className="section-head"><h2>Latest tips</h2><Link href={`${base}/videos`}>View all</Link></div>
          <div className="video-row">
            {videos.map((v) => <VideoCard key={v.id} video={v} href={`${base}/videos/${v.id}`} tall />)}
          </div>
        </section>
      )}

      <section>
        <div className="section-head"><h2>Your trainer</h2></div>
        <div className="coach-card">
          {trainer.hero_image_url ? <img src={trainer.hero_image_url} alt="" /> : <div className="media-fallback" />}
          {socials[0] && (
            <a className="round-glass" href={socials[0][1]} target="_blank" rel="noopener noreferrer" aria-label={`${coach} on ${SOCIAL_LABELS[socials[0][0]]}`} style={{ position: "absolute", top: 14, right: 14 }}>
              <Icon name="play" />
            </a>
          )}
          <div className="glass-panel stack-sm">
            <div className="row" style={{ flexWrap: "nowrap" }}>
              <span className="avatar" style={{ width: 56, height: 56, border: "2px solid rgba(255,255,255,.7)", background: "rgba(255,255,255,.2)", color: "#fff" }}>
                {trainer.logo_url ? <img src={trainer.logo_url} alt="" /> : coach.slice(0, 1)}
              </span>
              <div className="grow">
                <h3>{coach}</h3>
                {trainer.headline && <p>{trainer.headline}</p>}
              </div>
            </div>
            <div className="grid-2" style={{ marginTop: 14 }}>
              <Link href={`/${trainer.slug}`} className="btn btn-light">View trainer</Link>
              {services.length > 0 ? (
                <Link href={`/${trainer.slug}/book`} className="btn btn-light"><Icon name="calendar" /> Book</Link>
              ) : (
                <Link href={`${base}/workouts/new`} className="btn btn-light"><Icon name="plus" /> Log</Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {announcements.length > 0 && (
        <section>
          <div className="section-head"><h2>From {coach}</h2><Link href={`${base}/inbox`}>All alerts</Link></div>
          <div className="list">
            {announcements.map((n) => (
              <div key={n.id} className="list-item" style={{ alignItems: "flex-start" }}>
                <span className="icon-bubble accent"><Icon name="megaphone" /></span>
                <div className="grow">
                  <strong>{n.title}</strong>
                  {n.body && <p className="small" style={{ margin: "2px 0 0", whiteSpace: "pre-wrap" }}>{n.body}</p>}
                  <div className="tiny muted" style={{ marginTop: 4 }}>{relativeTime(n.created_at, now)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {socials.length > 0 && (
        <section>
          <div className="section-head"><h2>Follow along</h2></div>
          <div className="scroll-x">
            {socials.map(([p, url]) => <a key={p} className="chip" href={url} target="_blank" rel="noopener noreferrer">{SOCIAL_LABELS[p]} <Icon name="arrow" width={14} height={14} /></a>)}
          </div>
        </section>
      )}
    </div>
  );
}
