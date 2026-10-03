import Link from "next/link";
import type { Block } from "@/lib/cms/blocks";
import { Markdown } from "@/lib/cms/markdown";
import { formatDuration, formatMoney } from "@/lib/format";
import { getVideos } from "@/lib/app-data";
import { VideoPlayer } from "@/components/app/VideoPlayer";
import type { BlockOf } from "@/lib/cms/blocks";
import type { PublicTrainer, Service } from "@/lib/types";

type Ctx = { trainer: PublicTrainer; services: Service[] };

export function Blocks({ blocks, ctx }: { blocks: Block[]; ctx: Ctx }) {
  return (
    <>
      {blocks.map((b) => (
        <BlockView key={b.id} block={b} ctx={ctx} />
      ))}
    </>
  );
}

function BlockView({ block: b, ctx }: { block: Block; ctx: Ctx }) {
  const bookHref = `/${ctx.trainer.slug}/book`;
  switch (b.type) {
    case "hero":
      return (
        <section className="container hero">
          <div className="narrow">
            <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)" }}>{b.heading}</h1>
            {b.subheading && <p className="muted" style={{ fontSize: "1.15rem" }}>{b.subheading}</p>}
            {b.button_label && ctx.services.length > 0 && <Link className="btn" href={bookHref}>{b.button_label}</Link>}
          </div>
          {b.image_url && <img className="hero-media" src={b.image_url} alt="" />}
        </section>
      );
    case "text":
      return (
        <section className="container narrow section prose">
          {b.heading && <h2>{b.heading}</h2>}
          <Markdown source={b.body} />
        </section>
      );
    case "image":
      return b.image_url ? (
        <figure className="container section" style={{ margin: "0 auto" }}>
          <img src={b.image_url} alt={b.alt} style={{ width: "100%", borderRadius: "var(--radius)" }} />
          {b.caption && <figcaption className="muted small" style={{ marginTop: 8 }}>{b.caption}</figcaption>}
        </figure>
      ) : null;
    case "services":
      if (ctx.services.length === 0) return null;
      return (
        <section className="container section">
          {b.heading && <h2>{b.heading}</h2>}
          {b.intro && <p className="muted narrow">{b.intro}</p>}
          <div className="grid">
            {ctx.services.map((s) => (
              <div key={s.id} className="card stack">
                <div>
                  <h3 style={{ marginBottom: 4 }}>{s.name}</h3>
                  <p className="muted small" style={{ margin: 0 }}>
                    {formatDuration(s.duration_minutes)} · {formatMoney(s.price_cents, s.currency)}
                  </p>
                </div>
                {s.description && <p className="muted">{s.description}</p>}
                <Link className="btn" href={`${bookHref}?service=${s.id}`}>Book</Link>
              </div>
            ))}
          </div>
        </section>
      );
    case "testimonials": {
      const items = b.items.filter((i) => i.quote.trim());
      if (items.length === 0) return null;
      return (
        <section className="container section">
          {b.heading && <h2>{b.heading}</h2>}
          <div className="grid">
            {items.map((t, i) => (
              <blockquote key={i} className="card" style={{ margin: 0 }}>
                <p>“{t.quote}”</p>
                {t.name && <footer className="muted small">— {t.name}</footer>}
              </blockquote>
            ))}
          </div>
        </section>
      );
    }
    case "faq": {
      const items = b.items.filter((i) => i.question.trim());
      if (items.length === 0) return null;
      return (
        <section className="container narrow section">
          {b.heading && <h2>{b.heading}</h2>}
          {items.map((f, i) => (
            <details key={i} className="faq">
              <summary>{f.question}</summary>
              <div className="prose"><Markdown source={f.answer} /></div>
            </details>
          ))}
        </section>
      );
    }
    case "cta":
      return (
        <section className="container section">
          <div className="card cta stack">
            <h2 style={{ margin: 0 }}>{b.heading}</h2>
            {b.body && <p className="muted" style={{ margin: 0 }}>{b.body}</p>}
            {ctx.services.length > 0 && <div><Link className="btn" href={bookHref}>{b.button_label || "Book now"}</Link></div>}
          </div>
        </section>
      );
    case "videos":
      return <VideosBlock block={b} trainerId={ctx.trainer.id} />;
    case "gallery": {
      const images = b.images.filter((i) => i.url);
      if (images.length === 0) return null;
      return (
        <section className="container section">
          {b.heading && <h2>{b.heading}</h2>}
          <div className="gallery">
            {images.map((img, i) => <img key={i} src={img.url} alt={img.alt} loading="lazy" />)}
          </div>
        </section>
      );
    }
  }
}

/** Public videos (visibility "public") from the latest uploads, a collection or a category. */
async function VideosBlock({ block: b, trainerId }: { block: BlockOf<"videos">; trainerId: string }) {
  const videos = await getVideos(trainerId, {
    publicOnly: true,
    limit: b.limit,
    collectionId: b.source === "collection" && b.value ? b.value : undefined,
    category: b.source === "category" && b.value ? b.value : undefined,
  });
  if (videos.length === 0) return null;
  return (
    <section className="container section">
      {b.heading && <h2>{b.heading}</h2>}
      <div className="grid">
        {videos.map((v) => (
          <div key={v.id} className="stack-sm">
            <VideoPlayer provider={v.provider === "upload" ? "file" : v.provider} id={v.provider === "upload" ? v.url : v.provider_id} title={v.title} thumbnail={v.thumbnail_url} />
            <strong>{v.title}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
