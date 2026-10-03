export type VideoProvider = "youtube" | "vimeo" | "tiktok" | "instagram" | "loom" | "file" | "upload";

export type ParsedVideo = {
  provider: VideoProvider;
  /** Provider's video id; for Vimeo unlisted links "id:hash"; for files the URL itself. */
  id: string;
  url: string;
};

export const PROVIDER_LABELS: Record<VideoProvider, string> = {
  youtube: "YouTube",
  vimeo: "Vimeo",
  tiktok: "TikTok",
  instagram: "Instagram",
  loom: "Loom",
  file: "Video",
  upload: "Upload",
};

const YT_ID = /^[\w-]{11}$/;

/** Recognise a pasted video link. Returns null for unsupported or malformed URLs. */
export function parseVideoUrl(input: string): ParsedVideo | null {
  let u: URL;
  try {
    u = new URL(input.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  const host = u.hostname.replace(/^(www\.|m\.)/, "");
  const parts = u.pathname.split("/").filter(Boolean);
  const url = u.toString();

  if (host === "youtu.be" && YT_ID.test(parts[0] ?? "")) return { provider: "youtube", id: parts[0], url };
  if (host === "youtube.com" || host === "youtube-nocookie.com" || host === "music.youtube.com") {
    const v = u.searchParams.get("v");
    if (parts[0] === "watch" && v && YT_ID.test(v)) return { provider: "youtube", id: v, url };
    if (["shorts", "live", "embed", "v"].includes(parts[0]) && YT_ID.test(parts[1] ?? "")) return { provider: "youtube", id: parts[1], url };
    return null;
  }

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const nums = parts.filter((p) => /^\d+$/.test(p));
    const id = nums[nums.length - 1];
    if (!id) return null;
    // Unlisted videos carry a privacy hash: vimeo.com/123/abcdef or ?h=abcdef
    const after = parts[parts.indexOf(id) + 1];
    const hash = u.searchParams.get("h") ?? (after && /^[0-9a-f]{6,}$/i.test(after) ? after : null);
    return { provider: "vimeo", id: hash ? `${id}:${hash}` : id, url };
  }

  if (host === "tiktok.com") {
    const i = parts.indexOf("video");
    if (i >= 0 && /^\d+$/.test(parts[i + 1] ?? "")) return { provider: "tiktok", id: parts[i + 1], url };
    return null;
  }

  if (host === "instagram.com") {
    const i = parts.findIndex((p) => p === "reel" || p === "p" || p === "tv" || p === "reels");
    if (i >= 0 && /^[\w-]+$/.test(parts[i + 1] ?? "")) return { provider: "instagram", id: parts[i + 1], url };
    return null;
  }

  if (host === "loom.com" && (parts[0] === "share" || parts[0] === "embed") && /^[0-9a-f]{32}$/.test(parts[1] ?? "")) {
    return { provider: "loom", id: parts[1], url };
  }

  if (/\.(mp4|webm|mov|m4v)$/i.test(u.pathname)) return { provider: "file", id: url, url };
  return null;
}

/** Iframe src for a stored video (privacy-friendly hosts where available). */
export function embedUrl(provider: VideoProvider, id: string): string | null {
  switch (provider) {
    case "youtube":
      return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`;
    case "vimeo": {
      const [vid, hash] = id.split(":");
      return `https://player.vimeo.com/video/${vid}?autoplay=1${hash ? `&h=${hash}` : ""}`;
    }
    case "tiktok":
      return `https://www.tiktok.com/embed/v2/${id}`;
    case "instagram":
      return `https://www.instagram.com/reel/${id}/embed`;
    case "loom":
      return `https://www.loom.com/embed/${id}?autoplay=1`;
    case "file":
    case "upload":
      return null;
  }
}

/** Name to use when neither the trainer nor the platform supplied a title. */
export function fallbackTitle(provider: VideoProvider): string {
  return provider === "instagram" ? "Instagram reel" : provider === "file" || provider === "upload" ? "Video" : `${PROVIDER_LABELS[provider]} video`;
}

export const isVertical = (provider: VideoProvider) => provider === "tiktok" || provider === "instagram";

/** Thumbnail we can derive without an API call. */
export function defaultThumbnail(provider: VideoProvider, id: string): string | null {
  return provider === "youtube" ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}

const OEMBED: Partial<Record<VideoProvider, (url: string) => string>> = {
  youtube: (url) => `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`,
  vimeo: (url) => `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`,
  tiktok: (url) => `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
  loom: (url) => `https://www.loom.com/v1/oembed?url=${encodeURIComponent(url)}`,
};

/** Best-effort title + thumbnail lookup. Never throws. */
export async function lookupVideo(v: ParsedVideo): Promise<{ title?: string; thumbnail_url?: string }> {
  const endpoint = OEMBED[v.provider]?.(v.url);
  if (!endpoint) return {};
  try {
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return {};
    const data = (await res.json()) as { title?: unknown; thumbnail_url?: unknown };
    const thumb = typeof data.thumbnail_url === "string" && data.thumbnail_url.startsWith("https://") ? data.thumbnail_url : undefined;
    return { title: typeof data.title === "string" ? data.title.slice(0, 160) : undefined, thumbnail_url: thumb };
  } catch {
    return {};
  }
}
