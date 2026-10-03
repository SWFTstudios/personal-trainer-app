import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { productName } from "@/lib/env";
import { getSiteChrome } from "@/lib/site";
import { getPublishedTrainer } from "@/lib/trainer";
import { SOCIAL_LABELS } from "@/lib/social";

export default async function TrainerSiteLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const trainer = await getPublishedTrainer(slug);
  if (!trainer) notFound();
  const { nav, services } = await getSiteChrome(trainer.id, trainer.slug);
  const appHref = `/${trainer.slug}/app`;
  const socials = Object.entries(trainer.social_links).filter(([, url]) => url) as [keyof typeof SOCIAL_LABELS, string][];

  return (
    <>
      <header className="site-header">
        <div className="container" style={{ position: "relative" }}>
          <Link href={`/${trainer.slug}`} className="topbar-title">
            {trainer.logo_url && <img className="logo" src={trainer.logo_url} alt="" />}
            <span>{trainer.display_name}</span>
          </Link>
          <nav className="site-nav" aria-label="Main">
            {nav.map((n) => <Link key={n.href} href={n.href}>{n.label}</Link>)}
            <Link href={appHref}>Member app</Link>
            <ThemeToggle compact />
            {services.length > 0 && <Link className="btn btn-sm" href={`/${trainer.slug}/book`}>Book</Link>}
          </nav>
          <details className="site-menu">
            <summary className="icon-btn" aria-label="Menu"><Icon name="menu" /></summary>
            <div className="site-menu-panel">
              {nav.map((n) => <Link key={n.href} href={n.href}>{n.label}</Link>)}
              <Link href={appHref}>Member app</Link>
              <div className="row spread" style={{ paddingTop: 12 }}>
                <span className="muted small">Appearance</span>
                <ThemeToggle />
              </div>
              {services.length > 0 && <Link className="btn btn-block" href={`/${trainer.slug}/book`}>Book a session</Link>}
            </div>
          </details>
        </div>
      </header>
      {children}
      <footer className="site-footer muted small">
        <div className="container stack">
          {socials.length > 0 && (
            <div className="row" style={{ justifyContent: "center" }}>
              {socials.map(([platform, url]) => (
                <a key={platform} href={url} rel="noopener noreferrer" target="_blank" className="chip">{SOCIAL_LABELS[platform]}</a>
              ))}
            </div>
          )}
          {trainer.location && <div>{trainer.location}</div>}
          {trainer.plan !== "pro" && <div>Powered by <a href="/">{productName()}</a></div>}
        </div>
      </footer>
    </>
  );
}
