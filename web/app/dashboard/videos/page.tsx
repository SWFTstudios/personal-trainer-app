import Link from "next/link";
import { VideoTabs } from "@/components/dashboard/VideoTabs";
import { Icon } from "@/components/ui/Icon";
import { all } from "@/lib/db";
import { toVideo } from "@/lib/rows";
import { requireTrainer } from "@/lib/trainer";
import { PROVIDER_LABELS } from "@/lib/video";
import { getCollections } from "@/lib/videos-admin";

type Props = { searchParams: Promise<{ collection?: string; q?: string }> };

export default async function VideoLibrary({ searchParams }: Props) {
  const { collection, q } = await searchParams;
  const trainer = await requireTrainer();
  const collections = await getCollections(trainer.id);
  const where = ["v.trainer_id = ?"];
  const params: unknown[] = [trainer.id];
  if (collection) {
    where.push("v.id IN (SELECT video_id FROM video_collections WHERE collection_id = ?)");
    params.push(collection);
  }
  if (q) {
    where.push("(v.title LIKE ? OR v.category LIKE ?)");
    params.push(`%${q}%`, `%${q}%`);
  }
  const rows = await all<Parameters<typeof toVideo>[0] & { collection_names: string | null }>(
    `SELECT v.*, (SELECT group_concat(c.name, ', ') FROM video_collections vc JOIN collections c ON c.id = vc.collection_id WHERE vc.video_id = v.id) AS collection_names
     FROM videos v WHERE ${where.join(" AND ")} ORDER BY COALESCE(v.published_at, v.created_at) DESC LIMIT 300`,
    ...params,
  );

  return (
    <>
      <div>
        <h1 style={{ marginBottom: 4 }}>Videos</h1>
        <p className="muted" style={{ margin: 0 }}>Upload videos, link them from YouTube, Vimeo, TikTok, Instagram or Loom, or import a whole channel.</p>
      </div>
      <VideoTabs active="/dashboard/videos" />

      <form className="row" style={{ flexWrap: "nowrap" }}>
        <input name="q" defaultValue={q} placeholder="Search videos" aria-label="Search videos" type="search" />
        {collection && <input type="hidden" name="collection" value={collection} />}
      </form>
      {collections.length > 0 && (
        <div className="scroll-x" aria-label="Filter by collection">
          <Link href="/dashboard/videos" className="chip" aria-current={!collection ? "page" : undefined}>All</Link>
          {collections.map((c) => (
            <Link key={c.id} href={`/dashboard/videos?collection=${c.id}`} className="chip" aria-current={collection === c.id ? "page" : undefined}>{c.name} · {c.count}</Link>
          ))}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="empty card">
          <Icon name="video" />
          <p>{q || collection ? "No videos match." : "Your library is empty."}</p>
          {!q && !collection && <Link href="/dashboard/videos/upload" className="btn">Upload your first video</Link>}
        </div>
      ) : (
        <div className="list">
          {rows.map((r) => {
            const v = toVideo(r);
            return (
              <Link key={v.id} href={`/dashboard/videos/${v.id}`} className="list-item">
                <div className="video-thumb" style={{ width: 104, flex: "none" }}>
                  {v.thumbnail_url && <img src={v.thumbnail_url} alt="" loading="lazy" />}
                  <span className="provider">{PROVIDER_LABELS[v.provider]}</span>
                </div>
                <div className="grow">
                  <strong style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{v.title}</strong>
                  <div className="tiny muted">
                    {[v.category, r.collection_names].filter(Boolean).join(" · ") || "Uncategorized"}
                  </div>
                  <div className="row" style={{ gap: 4, marginTop: 4 }}>
                    {!v.published && <span className="badge">Hidden</span>}
                    {v.visibility === "public" && <span className="badge badge-accent">Public</span>}
                  </div>
                </div>
                <Icon name="chevron" className="chev" />
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
