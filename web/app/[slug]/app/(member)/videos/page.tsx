import Link from "next/link";
import { VideoCard } from "@/components/app/VideoCard";
import { Icon } from "@/components/ui/Icon";
import { getVideoCategories, getVideos, getVisibleCollections } from "@/lib/app-data";
import { requireMember } from "@/lib/member";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ c?: string; collection?: string }> };

export default async function VideosPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { c: category, collection } = await searchParams;
  const { trainer } = await requireMember(slug);
  const base = `/${trainer.slug}/app/videos`;
  const [videos, categories, collections] = await Promise.all([
    getVideos(trainer.id, { category, collectionId: collection }),
    getVideoCategories(trainer.id),
    getVisibleCollections(trainer.id),
  ]);
  const current = collections.find((c) => c.id === collection);
  const browsing = !category && !collection;

  return (
    <div className="container stack-lg page-pad">
      {current ? (
        <div>
          <Link href={base} className="row muted small" style={{ textDecoration: "none", gap: 4 }}><Icon name="back" width={18} height={18} /> Videos</Link>
          <h1 style={{ margin: "8px 0 4px" }}>{current.name}</h1>
          {current.description && <p className="muted" style={{ margin: 0 }}>{current.description}</p>}
          <p className="small muted" style={{ margin: 0 }}>{current.count} {current.count === 1 ? "video" : "videos"}</p>
        </div>
      ) : (
        <h1 style={{ margin: 0 }}>Videos</h1>
      )}

      {browsing && collections.length > 0 && (
        <section className="stack-sm">
          <div className="section-head" style={{ marginBottom: 0 }}><h2>Programs & series</h2></div>
          <div className="video-row" style={{ gridAutoColumns: "82%" }}>
            {collections.map((c) => (
              <Link key={c.id} href={`${base}?collection=${c.id}`} className="media-card" style={{ aspectRatio: "16 / 11" }}>
                {c.cover ? <img src={c.cover} alt="" loading="lazy" /> : <div className="media-fallback" />}
                <span className="top-left glass-pill"><Icon name="grid" /> {c.count} {c.count === 1 ? "video" : "videos"}</span>
                <div className="media-body">
                  <div className="grow">
                    <h3 style={{ fontSize: "1.45rem" }}>{c.name}</h3>
                    {c.description && <div className="meta" style={{ margin: "4px 0 0" }}>{c.description}</div>}
                  </div>
                  <span className="round-go" aria-hidden="true"><Icon name="arrow" /></span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {!current && categories.length > 0 && (
        <div className="scroll-x" role="navigation" aria-label="Categories">
          <Link className="chip" href={base} aria-current={!category ? "page" : undefined}>All</Link>
          {categories.map((c) => (
            <Link key={c} className="chip" href={`${base}?c=${encodeURIComponent(c)}`} aria-current={category === c ? "page" : undefined}>{c}</Link>
          ))}
        </div>
      )}

      {videos.length === 0 ? (
        <div className="empty"><Icon name="video" /><p>No videos yet. Check back soon.</p></div>
      ) : (
        <div className="grid">
          {videos.map((v) => <VideoCard key={v.id} video={v} href={`${base}/${v.id}`} />)}
        </div>
      )}
    </div>
  );
}
