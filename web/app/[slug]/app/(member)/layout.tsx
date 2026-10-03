import Link from "next/link";
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
      <header className="topbar">
        <Link href={base} className="topbar-title">
          {trainer.logo_url ? <img className="logo" src={trainer.logo_url} alt="" /> : <span className="avatar" style={{ width: 32, height: 32 }}>{(trainer.display_name ?? "C")[0]}</span>}
          <span>{trainer.display_name}</span>
        </Link>
        <Link href={`${base}/profile`} className="avatar" aria-label="Your profile" style={{ textDecoration: "none" }}>
          {member.display_name.slice(0, 1).toUpperCase()}
        </Link>
      </header>
      <main className="app-main">{children}</main>
      <TabBar
        className="app-tabbar"
        tabs={[
          { href: base, label: "Home", icon: "home", exact: true },
          { href: `${base}/videos`, label: "Videos", icon: "play" },
          { href: `${base}/workouts/new`, label: "Log", icon: "plus", primary: true, exact: true },
          { href: `${base}/workouts`, label: "Workouts", icon: "dumbbell" },
          { href: `${base}/inbox`, label: "Alerts", icon: "bell", badge: unread },
        ]}
      />
    </>
  );
}
