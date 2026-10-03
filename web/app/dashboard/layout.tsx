import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { getUser } from "@/lib/auth/session";
import { brandStyle } from "@/lib/brand";
import { liveSiteBase } from "@/lib/dashboard";
import { env, productName } from "@/lib/env";
import { requireTrainer } from "@/lib/trainer";

const NAV: [string, [string, string][]][] = [
  ["Business", [["/dashboard", "Overview"], ["/dashboard/bookings", "Bookings"], ["/dashboard/clients", "Clients"]]],
  ["Website", [["/dashboard/pages", "Pages"], ["/dashboard/blog", "Blog"], ["/dashboard/media", "Media"], ["/dashboard/site", "Branding & settings"]]],
  ["Booking", [["/dashboard/services", "Services"], ["/dashboard/availability", "Availability"], ["/dashboard/intake", "Intake form"]]],
  ["Account", [["/dashboard/billing", "Billing & payments"]]],
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const trainer = await requireTrainer();
  const user = await getUser();
  const isAdmin = !!user && env.adminEmails().includes(user.email.toLowerCase());
  const site = liveSiteBase(trainer);

  return (
    <div className="dash" style={brandStyle(trainer.accent_color_hex)}>
      <nav className="dash-nav">
        <strong style={{ padding: "8px 12px" }}>{productName()}</strong>
        {NAV.map(([group, links]) => (
          <div key={group} className="dash-nav-group">
            <span className="muted small dash-nav-label">{group}</span>
            {links.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
          </div>
        ))}
        {site && <Link href={site} target="_blank">View my site ↗</Link>}
        {isAdmin && <Link href="/admin">Platform admin</Link>}
        <form action={signOut}><button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }}>Sign out</button></form>
      </nav>
      <main className="stack" style={{ minWidth: 0 }}>{children}</main>
    </div>
  );
}
