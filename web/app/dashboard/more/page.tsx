import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { Icon } from "@/components/ui/Icon";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { getUser } from "@/lib/auth/session";
import { liveSiteBase } from "@/lib/dashboard";
import { DASH_NAV } from "@/lib/dashboard-nav";
import { env } from "@/lib/env";
import { requireTrainer } from "@/lib/trainer";

export default async function MorePage() {
  const trainer = await requireTrainer();
  const user = await getUser();
  const site = liveSiteBase(trainer);
  return (
    <>
      <h1 style={{ margin: 0 }}>Menu</h1>
      {DASH_NAV.map(({ group, links }) => (
        <section key={group} className="stack-sm">
          <div className="nav-label" style={{ padding: "0 4px" }}>{group}</div>
          <div className="list">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="list-item"><Icon name={l.icon} /><span className="grow">{l.label}</span><Icon name="chevron" className="chev" /></Link>
            ))}
          </div>
        </section>
      ))}
      <section className="stack-sm">
        <div className="nav-label" style={{ padding: "0 4px" }}>Account</div>
        <div className="list">
          {site && <a href={site} target="_blank" className="list-item"><Icon name="external" /><span className="grow">View my site</span></a>}
          {site && <a href={`${site}/app`} target="_blank" className="list-item"><Icon name="external" /><span className="grow">Open member app</span></a>}
          {user && env.adminEmails().includes(user.email.toLowerCase()) && <Link href="/admin" className="list-item"><Icon name="chart" /><span className="grow">Platform admin</span></Link>}
          <div className="list-item"><span className="grow">Appearance</span><ThemeToggle /></div>
        </div>
      </section>
      <form action={signOut}><button className="btn btn-ghost btn-block"><Icon name="logout" /> Sign out</button></form>
    </>
  );
}
