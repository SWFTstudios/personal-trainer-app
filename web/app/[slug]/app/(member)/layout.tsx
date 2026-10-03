import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { TabBar } from "@/components/ui/TabBar";
import { requireMember } from "@/lib/member";
import { unreadCount } from "@/lib/notify";

export default async function MemberLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { trainer, member } = await requireMember(slug);
  const unread = await unreadCount(member.id, trainer.id, member.notifications_seen_at);
  const base = `/${trainer.slug}/app`;

  return (
    <>
      <header className="app-header">
        <Link href={base} className="who" aria-label={`${trainer.display_name} home`}>
          <span className="avatar">
            {trainer.logo_url ? <img src={trainer.logo_url} alt="" /> : (trainer.display_name ?? "C").slice(0, 1)}
          </span>
          <span style={{ minWidth: 0 }}>
            <small>Training with</small>
            <strong>{trainer.display_name}</strong>
          </span>
        </Link>
        <div className="row" style={{ gap: 8, flexWrap: "nowrap" }}>
          <Link href={`${base}/inbox`} className="icon-btn" aria-label={unread ? `Alerts, ${unread} new` : "Alerts"}>
            <Icon name="bell" />
            {unread > 0 && <span className="dot-badge">{unread > 9 ? "9+" : unread}</span>}
          </Link>
          <Link href={`${base}/profile`} className="icon-btn" aria-label="Your profile" style={{ fontWeight: 600 }}>
            {member.display_name.slice(0, 1).toUpperCase()}
          </Link>
        </div>
      </header>
      <main className="app-main">{children}</main>
      <TabBar
        className="app-tabbar"
        tabs={[
          { href: base, label: "Home", icon: "home", exact: true },
          { href: `${base}/videos`, label: "Videos", icon: "play" },
          { href: `${base}/workouts/new`, label: "Log workout", icon: "plus", primary: true, exact: true },
          { href: `${base}/workouts`, label: "Workouts", icon: "dumbbell" },
          { href: `${base}/inbox`, label: "Alerts", icon: "bell", badge: unread },
        ]}
      />
    </>
  );
}
