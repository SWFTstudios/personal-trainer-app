"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./Icon";

export type Tab = { href: string; label: string; icon: IconName; primary?: boolean; badge?: number; exact?: boolean };

const matches = (path: string, t: Pick<Tab, "href" | "exact">) => (t.exact ? path === t.href : path === t.href || path.startsWith(`${t.href}/`));

export function TabBar({ tabs, className = "" }: { tabs: Tab[]; className?: string }) {
  const path = usePathname();
  // The most specific matching tab wins (e.g. /workouts/new is "Log", not "Workouts").
  const activeHref = tabs.filter((t) => matches(path, t)).sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    <nav className={`tabbar ${className}`} aria-label="Primary">
      {tabs.map((t) => {
        const active = t.href === activeHref;
        return (
          <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined} className={t.primary ? "tab-primary" : undefined}>
            <span><Icon name={t.icon} /></span>
            <span>{t.label}</span>
            {!!t.badge && <span className="dot-badge" aria-label={`${t.badge} new`}>{t.badge > 9 ? "9+" : t.badge}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

/** Sidebar nav link with active state (desktop dashboard). */
export function NavLink({ href, label, icon, exact, badge }: Omit<Tab, "primary">) {
  const path = usePathname();
  const active = matches(path, { href, exact });
  return (
    <Link href={href} aria-current={active ? "page" : undefined}>
      <Icon name={icon} /> <span className="grow">{label}</span>
      {!!badge && <span className="badge badge-accent">{badge}</span>}
    </Link>
  );
}
