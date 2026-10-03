import Link from "next/link";
import { notFound } from "next/navigation";
import { brandStyle } from "@/lib/brand";
import { productName } from "@/lib/env";
import { getSiteChrome } from "@/lib/site";
import { getPublishedTrainer } from "@/lib/trainer";

export default async function TrainerSiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const trainer = await getPublishedTrainer(slug);
  if (!trainer) notFound();
  const { nav, services } = await getSiteChrome(trainer.id, trainer.slug);

  return (
    <div style={brandStyle(trainer.accent_color_hex)}>
      <header className="site-header">
        <div className="container row spread">
          <Link href={`/${trainer.slug}`} className="row" style={{ textDecoration: "none" }}>
            {trainer.logo_url && <img className="logo" src={trainer.logo_url} alt="" />}
            <strong>{trainer.display_name}</strong>
          </Link>
          <nav className="site-nav">
            {nav.map((n) => <Link key={n.href} href={n.href}>{n.label}</Link>)}
            {services.length > 0 && <Link className="btn btn-sm" href={`/${trainer.slug}/book`}>Book</Link>}
          </nav>
        </div>
      </header>
      {children}
      <footer className="site-footer muted small">
        <div className="container stack">
          <div className="row" style={{ justifyContent: "center" }}>
            {trainer.location && <span>{trainer.location}</span>}
            {trainer.instagram_url && <a href={trainer.instagram_url} rel="noopener noreferrer" target="_blank">Instagram</a>}
          </div>
          {trainer.plan !== "pro" && <div>Powered by <a href="/">{productName()}</a></div>}
        </div>
      </footer>
    </div>
  );
}
