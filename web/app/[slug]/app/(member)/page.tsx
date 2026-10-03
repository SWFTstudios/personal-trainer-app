import Link from "next/link";
import { PushToggle } from "@/components/app/PushToggle";
import { VideoCard } from "@/components/app/VideoCard";
import { Icon } from "@/components/ui/Icon";
import { getCurrentLive, getMemberNotifications, getMemberWorkouts, getVideos, relativeTime } from "@/lib/app-data";
import { getActiveServices } from "@/lib/booking";
import { requireMember } from "@/lib/member";
import { vapidKeys } from "@/lib/notify";
import { LIVE_LABELS, SOCIAL_LABELS } from "@/lib/social";
import { weekStreak } from "@/lib/workouts";

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

  const weekAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString().slice(0, 10);
  const thisWeek = workouts.filter((w) => w.performed_on >= weekAgo).length;
  const streak = weekStreak(workouts.map((w) => w.performed_on), now);
  const newFeedback = workouts.filter((w) => w.status === "reviewed" && w.reviewed_at && w.reviewed_at > member.notifications_seen_at).length;
  const firstName = member.display_name.split(" ")[0];
  const announcements = notes.filter((n) => n.kind === "announcement");
  const socials = Object.entries(trainer.social_links).filter(([, u]) => u) as [keyof typeof SOCIAL_LABELS, string][];

  return (
    <div className="container stack page-pad">
      <div>
        <p className="muted small" style={{ margin: 0 }}>{now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
        <h1 style={{ margin: 0 }}>Hi {firstName}</h1>
      </div>

      {live && (
        <a className="live-banner" href={live.url} target="_blank" rel="noopener noreferrer">
          {live.status === "live" ? <span className="live-dot" /> : <Icon name="calendar" />}
          <div className="grow">
            <strong>{live.status === "live" ? `${trainer.display_name} is live now` : "Upcoming live session"}</strong>
            <div className="small muted">
              {live.title} · {LIVE_LABELS[live.platform]}
              {live.status === "scheduled" && ` · ${new Date(live.starts_at).toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" })}`}
            </div>
          </div>
          <span className={`badge ${live.status === "live" ? "badge-live" : ""}`}>{live.status === "live" ? "Watch" : "Soon"}</span>
        </a>
      )}

      <PushToggle slug={trainer.slug} vapidKey={vapidKeys()?.publicKey ?? null} coach={trainer.display_name ?? "your coach"} variant="card" />

      <div className="grid-2">
        <div className="card"><div className="muted small">This week</div><p className="stat">{thisWeek} <span className="small muted">workouts</span></p></div>
        <div className="card"><div className="muted small">Streak</div><p className="stat">{streak} <span className="small muted">{streak === 1 ? "week" : "weeks"}</span></p></div>
      </div>

      <Link href={`${base}/workouts/new`} className="card row" style={{ textDecoration: "none", flexWrap: "nowrap" }}>
        <span className="avatar" style={{ background: "var(--accent)", color: "var(--accent-text)" }}><Icon name="plus" /></span>
        <div className="grow"><strong>Log a workout</strong><div className="muted small">Send it to {trainer.display_name} for feedback</div></div>
        <Icon name="chevron" className="chev" />
      </Link>

      {newFeedback > 0 && (
        <Link href={`${base}/workouts`} className="notice row" style={{ textDecoration: "none", flexWrap: "nowrap" }}>
          <Icon name="chat" /> <span className="grow"><strong>New feedback</strong> on {newFeedback} workout{newFeedback > 1 ? "s" : ""}</span>
          <Icon name="chevron" />
        </Link>
      )}

      {videos.length > 0 && (
        <section className="stack-sm">
          <div className="row spread"><h2 style={{ margin: 0 }}>Latest tips</h2><Link href={`${base}/videos`} className="small">See all</Link></div>
          <div className="video-row">
            {videos.map((v) => <VideoCard key={v.id} video={v} href={`${base}/videos/${v.id}`} />)}
          </div>
        </section>
      )}

      {announcements.length > 0 && (
        <section className="stack-sm">
          <h2 style={{ margin: 0 }}>From {trainer.display_name}</h2>
          <div className="list">
            {announcements.map((n) => (
              <div key={n.id} className="list-item" style={{ alignItems: "flex-start" }}>
                <Icon name="megaphone" />
                <div className="grow">
                  <strong>{n.title}</strong>
                  {n.body && <p className="small" style={{ margin: "2px 0 0", whiteSpace: "pre-wrap" }}>{n.body}</p>}
                  <div className="tiny muted">{relativeTime(n.created_at, now)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {(services.length > 0 || socials.length > 0) && (
        <section className="stack-sm">
          <h2 style={{ margin: 0 }}>Stay connected</h2>
          {services.length > 0 && <Link href={`/${trainer.slug}/book`} className="btn btn-ghost btn-block"><Icon name="calendar" /> Book a session</Link>}
          {socials.length > 0 && (
            <div className="scroll-x">
              {socials.map(([p, url]) => <a key={p} className="chip" href={url} target="_blank" rel="noopener noreferrer">{SOCIAL_LABELS[p]} <Icon name="external" width={14} height={14} /></a>)}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
