import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { brandStyle } from "@/lib/brand";
import { productName } from "@/lib/env";
import { requireTrainer } from "@/lib/trainer";

const NAV = [
  ["/dashboard", "Bookings"],
  ["/dashboard/site", "Site"],
  ["/dashboard/services", "Services"],
  ["/dashboard/availability", "Availability"],
  ["/dashboard/intake", "Intake form"],
  ["/dashboard/billing", "Billing & payments"],
] as const;

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const trainer = await requireTrainer();
  return (
    <div className="dash" style={brandStyle(trainer.accent_color_hex)}>
      <nav className="dash-nav">
        <strong style={{ padding: "8px 12px" }}>{productName}</strong>
        {NAV.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
        {trainer.slug && trainer.site_published && <Link href={`/${trainer.slug}`} target="_blank">View my site ↗</Link>}
        <form action={signOut}><button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }}>Sign out</button></form>
      </nav>
      <main className="stack" style={{ minWidth: 0 }}>{children}</main>
    </div>
  );
}
