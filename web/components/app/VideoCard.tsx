import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { PROVIDER_LABELS } from "@/lib/video";
import type { Video } from "@/lib/types";

export function VideoCard({ video, href }: { video: Video; href: string }) {
  return (
    <Link href={href} className="video-card">
      <div className="video-thumb">
        {video.thumbnail_url ? <img src={video.thumbnail_url} alt="" loading="lazy" /> : null}
        <div className="play"><span><Icon name="play" /></span></div>
        <span className="provider">{PROVIDER_LABELS[video.provider]}</span>
      </div>
      <h3>{video.title}</h3>
      {video.category && <p className="muted small" style={{ margin: 0 }}>{video.category}</p>}
    </Link>
  );
}
