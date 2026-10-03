import { Icon, type IconName } from "@/components/ui/Icon";
import { getMemberNotifications, relativeTime } from "@/lib/app-data";
import { nowIso, run } from "@/lib/db";
import { requireMember } from "@/lib/member";
import type { NotificationKind } from "@/lib/types";

const KIND_ICON: Record<NotificationKind, IconName> = { live: "live", video: "play", feedback: "chat", announcement: "megaphone" };

export default async function InboxPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { trainer, member } = await requireMember(slug);
  const items = await getMemberNotifications(trainer.id, member.id, 100);
  const seen = member.notifications_seen_at;
  await run("UPDATE members SET notifications_seen_at = ? WHERE id = ?", nowIso(), member.id);
  const now = new Date();

  return (
    <div className="container stack page-pad">
      <h1 style={{ margin: 0 }}>Alerts</h1>
      {items.length === 0 ? (
        <div className="empty"><Icon name="bell" /><p>Nothing yet. Live sessions, new videos and feedback will show up here.</p></div>
      ) : (
        <div className="list">
          {items.map((n) => {
            const unread = n.created_at > seen;
            const external = n.url?.startsWith("https://");
            const content = (
              <>
                <span className="avatar" style={n.kind === "live" ? { background: "var(--live)", color: "#fff" } : undefined}>
                  <Icon name={KIND_ICON[n.kind]} width={20} height={20} />
                </span>
                <div className="grow">
                  <strong style={{ fontWeight: unread ? 800 : 600 }}>{n.title}</strong>
                  {n.body && <div className="small" style={{ whiteSpace: "pre-wrap" }}>{n.body}</div>}
                  <div className="tiny muted">{relativeTime(n.created_at, now)}</div>
                </div>
                {unread && <span className="live-dot" style={{ background: "var(--accent)", animation: "none", width: 10, height: 10 }} aria-label="New" />}
              </>
            );
            return n.url ? (
              <a key={n.id} href={n.url} className="list-item" {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{content}</a>
            ) : (
              <div key={n.id} className="list-item">{content}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
