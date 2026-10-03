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
    <div className="container stack page-pad">
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
          <h2 style={{ margin: 0 }}>Programs & series</h2>
          <div className="video-row">
            {collections.map((c) => (
              <Link key={c.id} href={`${base}?collection=${c.id}`} className="video-card">
                <div className="video-thumb">
                  {c.cover && <img src={c.cover} alt="" loading="lazy" />}
                  <span className="provider">{c.count} {c.count === 1 ? "video" : "videos"}</span>
                </div>
                <h3>{c.name}</h3>
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
