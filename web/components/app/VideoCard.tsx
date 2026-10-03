import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { PROVIDER_LABELS } from "@/lib/video";
import type { Video } from "@/lib/types";

/** Image-forward video card: thumbnail with gradient, title over the image, round arrow button. */
export function VideoCard({ video, href, tall = false }: { video: Video; href: string; tall?: boolean }) {
  return (
    <Link href={href} className={`media-card ${tall ? "ratio-tall" : "ratio-video"}`}>
      {video.thumbnail_url ? <img src={video.thumbnail_url} alt="" loading="lazy" /> : <div className="media-fallback" />}
      <span className="top-left glass-pill"><Icon name="play" /> {PROVIDER_LABELS[video.provider]}</span>
      <div className="media-body">
        <div className="grow">
          {video.category && <div className="meta">{video.category}</div>}
          <h3>{video.title}</h3>
        </div>
        <span className="round-go" aria-hidden="true"><Icon name="arrow" /></span>
      </div>
    </Link>
  );
}
