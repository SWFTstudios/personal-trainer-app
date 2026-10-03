import Link from "next/link";
import { notFound } from "next/navigation";
import { VideoCard } from "@/components/app/VideoCard";
import { VideoPlayer } from "@/components/app/VideoPlayer";
import { Icon } from "@/components/ui/Icon";
import { getVideos } from "@/lib/app-data";
import { first } from "@/lib/db";
import { requireMember } from "@/lib/member";
import { toVideo } from "@/lib/rows";
import { PROVIDER_LABELS } from "@/lib/video";

export default async function VideoPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const { trainer } = await requireMember(slug);
  const row = await first<Parameters<typeof toVideo>[0]>("SELECT * FROM videos WHERE id = ? AND trainer_id = ? AND published = 1", id, trainer.id);
  if (!row) notFound();
  const video = toVideo(row);
  const more = (await getVideos(trainer.id, { category: video.category ?? undefined, limit: 7 })).filter((v) => v.id !== video.id).slice(0, 6);
  const base = `/${trainer.slug}/app/videos`;

  return (
    <div className="container stack page-pad">
      <Link href={base} className="row muted small" style={{ textDecoration: "none", gap: 4 }}><Icon name="back" width={18} height={18} /> Videos</Link>
      <VideoPlayer provider={video.provider === "upload" ? "file" : video.provider} id={video.provider === "upload" ? video.url : video.provider_id} title={video.title} thumbnail={video.thumbnail_url} />
      <div>
        <h1 style={{ fontSize: "1.4rem", marginBottom: 4 }}>{video.title}</h1>
        <div className="row small muted" style={{ gap: 8 }}>
          {video.category && <span className="badge">{video.category}</span>}
          {video.provider !== "upload" && (
            <a href={video.url} target="_blank" rel="noopener noreferrer" className="row" style={{ gap: 4 }}>Open in {PROVIDER_LABELS[video.provider]} <Icon name="external" width={14} height={14} /></a>
          )}
        </div>
      </div>
      {video.description && <p style={{ whiteSpace: "pre-wrap" }}>{video.description}</p>}
      {more.length > 0 && (
        <section className="stack-sm">
          <h2>More like this</h2>
          <div className="video-row">{more.map((v) => <VideoCard key={v.id} video={v} href={`${base}/${v.id}`} />)}</div>
        </section>
      )}
    </div>
  );
}
