import { Icon } from "@/components/ui/Icon";
import { getCurrentLive, relativeTime } from "@/lib/app-data";
import { all, first } from "@/lib/db";
import { vapidKeys } from "@/lib/notify";
import { LIVE_LABELS, SOCIAL_LABELS } from "@/lib/social";
import { requireTrainer } from "@/lib/trainer";
import type { AppNotification } from "@/lib/types";
import { endLive, goLive, sendAnnouncement } from "../app-actions";
import { Notice } from "../Notice";
import { TzOffset } from "./TzOffset";

type Props = { searchParams: Promise<{ error?: string; sent?: string; announced?: string }> };

export default async function LivePage({ searchParams }: Props) {
  const { error, sent, announced } = await searchParams;
  const trainer = await requireTrainer();
  const [current, counts, recent] = await Promise.all([
    getCurrentLive(trainer.id),
    first<{ members: number; devices: number }>(
      `SELECT (SELECT COUNT(*) FROM members WHERE trainer_id = ?1) AS members,
              (SELECT COUNT(*) FROM push_subscriptions s JOIN members m ON m.id = s.member_id WHERE m.trainer_id = ?1) AS devices`,
      trainer.id,
    ),
    all<AppNotification>("SELECT * FROM notifications WHERE trainer_id = ? AND member_id IS NULL ORDER BY created_at DESC LIMIT 10", trainer.id),
  ]);
  const socials = Object.entries(trainer.social_links).filter(([, u]) => u) as [keyof typeof SOCIAL_LABELS, string][];
  const firstSocial = socials[0];

  return (
    <>
      <div>
        <h1 style={{ marginBottom: 4 }}>Live & alerts</h1>
        <p className="muted" style={{ margin: 0 }}>
          Going live on social? One tap notifies {counts?.members ?? 0} member{counts?.members === 1 ? "" : "s"} ({counts?.devices ?? 0} with phone alerts on).
        </p>
      </div>
      {!vapidKeys() && <p className="notice small">Push notifications aren't configured on this server yet (VAPID keys). Alerts still appear in the members' app.</p>}
      <Notice error={error} success={sent ? "Members notified." : announced ? "Announcement sent." : undefined} />

      {current && (
        <div className="live-banner">
          {current.status === "live" ? <span className="live-dot" /> : <Icon name="calendar" />}
          <div className="grow">
            <strong>{current.status === "live" ? "You're live" : "Scheduled"}: {current.title}</strong>
            <div className="small muted">{LIVE_LABELS[current.platform]} · started {relativeTime(current.starts_at)}</div>
          </div>
          <form action={endLive.bind(null, current.id)}><button className="btn btn-sm btn-ghost">{current.status === "live" ? "End" : "Cancel"}</button></form>
        </div>
      )}

      <form action={goLive} className="card stack">
        <h2 style={{ margin: 0 }}><Icon name="live" style={{ verticalAlign: "-4px", color: "var(--live)" }} /> Go live</h2>
        <div>
          <label htmlFor="platform">Where?</label>
          <select id="platform" name="platform" defaultValue={firstSocial?.[0] ?? "instagram"}>
            {Object.entries(LIVE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="url">Link</label>
          <input id="url" name="url" type="url" inputMode="url" required defaultValue={firstSocial?.[1] ?? ""} placeholder="https://instagram.com/you/live" />
          {socials.length > 1 && (
            <div className="scroll-x" style={{ marginTop: 8 }}>
              {socials.map(([p, u]) => <span key={p} className="chip tiny" title={u}>{SOCIAL_LABELS[p]}: {u.replace(/^https:\/\/(www\.)?/, "").slice(0, 28)}</span>)}
            </div>
          )}
        </div>
        <div><label htmlFor="title">What's it about?</label><input id="title" name="title" placeholder="20-min mobility flow" /></div>
        <details>
          <summary className="small" style={{ cursor: "pointer", minHeight: 32 }}>Schedule for later</summary>
          <div style={{ marginTop: 8 }}>
            <label htmlFor="starts_at">Starts at</label>
            <input id="starts_at" name="starts_at" type="datetime-local" />
          </div>
        </details>
        <TzOffset />
        <button className="btn" style={{ background: "var(--live)", color: "#fff" }}><Icon name="live" /> Notify members</button>
      </form>

      <form action={sendAnnouncement} className="card stack">
        <h2 style={{ margin: 0 }}><Icon name="megaphone" style={{ verticalAlign: "-4px" }} /> Announcement</h2>
        <div><label htmlFor="a-title">Title</label><input id="a-title" name="title" required placeholder="New program drops Monday" /></div>
        <div><label htmlFor="a-body">Message</label><textarea id="a-body" name="body" rows={3} /></div>
        <div><label htmlFor="a-link">Link (optional)</label><input id="a-link" name="link" type="url" inputMode="url" placeholder="https://" /></div>
        <button className="btn btn-ghost"><Icon name="send" /> Send to members</button>
      </form>

      {recent.length > 0 && (
        <section className="stack-sm">
          <h2>Recently sent</h2>
          <div className="list">
            {recent.map((n) => (
              <div key={n.id} className="list-item">
                <Icon name={n.kind === "live" ? "live" : n.kind === "video" ? "play" : "megaphone"} />
                <div className="grow"><strong>{n.title}</strong>{n.body && <div className="small muted">{n.body}</div>}</div>
                <span className="tiny muted">{relativeTime(n.created_at)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

