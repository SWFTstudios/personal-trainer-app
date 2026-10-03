"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { embedUrl, isVertical, type VideoProvider } from "@/lib/video";

/** Click-to-load player: shows the thumbnail until tapped, then loads the provider's embed. */
export function VideoPlayer({ provider, id, title, thumbnail }: { provider: VideoProvider; id: string; title: string; thumbnail: string | null }) {
  const [active, setActive] = useState(false);
  const vertical = isVertical(provider);

  if (provider === "file") {
    return (
      <div className="embed">
        <video src={id} controls playsInline preload="metadata" poster={thumbnail ?? undefined} />
      </div>
    );
  }

  const src = embedUrl(provider, id)!;
  return (
    <div className={`embed${vertical ? " vertical" : ""}`}>
      {active ? (
        <iframe
          src={src}
          title={title}
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <button type="button" className="embed-facade" onClick={() => setActive(true)} aria-label={`Play ${title}`}>
          {thumbnail && <img src={thumbnail} alt="" />}
          <span className="video-thumb" style={{ position: "absolute", inset: 0, background: "transparent", aspectRatio: "auto" }}>
            <span className="play"><span><Icon name="play" /></span></span>
          </span>
        </button>
      )}
    </div>
  );
}
