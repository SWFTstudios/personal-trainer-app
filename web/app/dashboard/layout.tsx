import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { Icon } from "@/components/ui/Icon";
import { NavLink, TabBar } from "@/components/ui/TabBar";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { getUser } from "@/lib/auth/session";
import { brandStyle } from "@/lib/brand";
import { liveSiteBase } from "@/lib/dashboard";
import { DASH_NAV } from "@/lib/dashboard-nav";
import { first } from "@/lib/db";
import { env, productName } from "@/lib/env";
import { requireTrainer } from "@/lib/trainer";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const trainer = await requireTrainer();
  const user = await getUser();
  const isAdmin = !!user && env.adminEmails().includes(user.email.toLowerCase());
  const site = liveSiteBase(trainer);
  const pending = (await first<{ n: number }>("SELECT COUNT(*) AS n FROM workouts WHERE trainer_id = ? AND status = 'submitted'", trainer.id))?.n ?? 0;
  const badges: Record<string, number> = { "/dashboard/workouts": pending };

  return (
    <div className="brand dash" style={brandStyle(trainer)}>
      <aside className="dash-sidebar" aria-label="Dashboard">
        <div className="row spread" style={{ padding: "0 12px 8px" }}>
          <strong>{productName()}</strong>
          <ThemeToggle compact />
        </div>
        {DASH_NAV.map(({ group, links }) => (
          <div key={group}>
            <div className="nav-label">{group}</div>
            {links.map((l) => <NavLink key={l.href} {...l} badge={badges[l.href]} />)}
          </div>
        ))}
        <div className="nav-label">Shortcuts</div>
        {site && <a href={site} target="_blank" className="nav-link"><Icon name="external" /> View my site</a>}
        {site && <a href={`${site}/app`} target="_blank" className="nav-link"><Icon name="external" /> Open member app</a>}
        {isAdmin && <Link href="/admin" className="nav-link"><Icon name="chart" /> Platform admin</Link>}
        <form action={signOut}><button className="nav-link" style={{ border: 0, background: "none", width: "100%", font: "inherit", cursor: "pointer" }}><Icon name="logout" /> Sign out</button></form>
      </aside>

      <header className="topbar">
        <Link href="/dashboard" className="topbar-title">
          {trainer.logo_url ? <img className="logo" src={trainer.logo_url} alt="" /> : null}
          <span>{trainer.display_name ?? productName()}</span>
        </Link>
        <div className="row" style={{ gap: 0 }}>
          {site && <a href={site} target="_blank" className="icon-btn" aria-label="View my site"><Icon name="external" /></a>}
          <ThemeToggle compact />
        </div>
      </header>

      <main className="dash-main stack">{children}</main>

      <TabBar
        tabs={[
          { href: "/dashboard", label: "Home", icon: "home", exact: true },
          { href: "/dashboard/workouts", label: "Feedback", icon: "chat", badge: pending },
          { href: "/dashboard/live", label: "Go live", icon: "live", primary: true },
          { href: "/dashboard/videos", label: "Videos", icon: "video" },
          { href: "/dashboard/more", label: "More", icon: "more" },
        ]}
      />
    </div>
  );
}
