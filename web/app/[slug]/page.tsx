import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDuration, formatMoney } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublishedTrainer } from "@/lib/trainer";
import type { Service } from "@/lib/types";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const trainer = await getPublishedTrainer((await params).slug);
  if (!trainer) return {};
  const name = trainer.display_name ?? "Personal training";
  return {
    title: trainer.headline ? `${name} · ${trainer.headline}` : name,
    description: trainer.bio?.slice(0, 160) ?? undefined,
    openGraph: { images: trainer.hero_image_url ? [trainer.hero_image_url] : undefined },
  };
}

export default async function TrainerLandingPage({ params }: Props) {
  const { slug } = await params;
  const trainer = await getPublishedTrainer(slug);
  if (!trainer) notFound();

  const { data } = await createAdminClient()
    .from("services")
    .select("*")
    .eq("trainer_id", trainer.id)
    .eq("active", true)
    .order("sort_order")
    .order("created_at");
  const services = (data ?? []) as Service[];

  return (
    <main>
      <section className="container hero">
        <div className="row spread">
          <div className="row">
            {trainer.logo_url && <img className="logo" src={trainer.logo_url} alt="" />}
            <strong>{trainer.display_name}</strong>
          </div>
          {services.length > 0 && <Link className="btn btn-sm" href={`/${slug}/book`}>Book a session</Link>}
        </div>
        <div className="narrow" style={{ marginTop: 48 }}>
          <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)" }}>{trainer.headline ?? trainer.display_name}</h1>
          {trainer.location && <p className="muted">{trainer.location}</p>}
        </div>
        {trainer.hero_image_url && <img className="hero-media" src={trainer.hero_image_url} alt="" />}
      </section>

      {trainer.bio && (
        <section className="container narrow" style={{ paddingBottom: 40 }}>
          <h2>About</h2>
          {trainer.bio.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
          {trainer.instagram_url && <a href={trainer.instagram_url} rel="noopener noreferrer" target="_blank">Instagram</a>}
        </section>
      )}

      {services.length > 0 && (
        <section className="container" style={{ paddingBottom: 40 }}>
          <h2>Sessions</h2>
          <div className="grid">
            {services.map((s) => (
              <div key={s.id} className="card stack">
                <div>
                  <h3 style={{ marginBottom: 4 }}>{s.name}</h3>
                  <p className="muted small" style={{ margin: 0 }}>
                    {formatDuration(s.duration_minutes)} · {formatMoney(s.price_cents, s.currency)}
                  </p>
                </div>
                {s.description && <p className="muted">{s.description}</p>}
                <Link className="btn" href={`/${slug}/book?service=${s.id}`}>Book</Link>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
