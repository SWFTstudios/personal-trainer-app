// Finding a trainer's videos on YouTube and Vimeo from their public channel URL.
// Works without keys (YouTube RSS: latest 15; Vimeo simple API); API keys unlock full back catalogs.

export type FoundVideo = {
  provider: "youtube" | "vimeo";
  id: string;
  url: string;
  title: string;
  thumbnail_url: string | null;
  published_at: string | null;
};

export type ResolvedSource = { platform: "youtube" | "vimeo"; external_id: string; label: string; url: string };
export type SyncKeys = { youtubeApiKey?: string; vimeoToken?: string };

const UA = { "User-Agent": "Mozilla/5.0 (compatible; TrainerKit/1.0)", "Accept-Language": "en" };
const decode = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

async function fetchText(url: string, init: RequestInit = {}): Promise<string> {
  const res = await fetch(url, { ...init, headers: { ...UA, ...(init.headers ?? {}) }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`${new URL(url).hostname} returned ${res.status}`);
  return res.text();
}

/** Accepts a channel/profile URL or an @handle. */
export async function resolveSource(input: string, fetchHtml = fetchText): Promise<ResolvedSource> {
  const raw = input.trim();
  const asUrl = raw.startsWith("@") ? `https://www.youtube.com/${raw}` : raw.startsWith("http") ? raw : `https://${raw}`;
  let u: URL;
  try {
    u = new URL(asUrl);
  } catch {
    throw new Error("Paste your YouTube channel or Vimeo profile link.");
  }
  const host = u.hostname.replace(/^(www\.|m\.)/, "");
  const parts = u.pathname.split("/").filter(Boolean);

  if (host === "youtube.com") {
    if (parts[0] === "channel" && /^UC[\w-]{22}$/.test(parts[1] ?? "")) {
      return { platform: "youtube", external_id: parts[1], label: parts[1], url: `https://www.youtube.com/channel/${parts[1]}` };
    }
    if (!parts[0] || !(parts[0].startsWith("@") || parts[0] === "c" || parts[0] === "user")) throw new Error("That doesn't look like a YouTube channel link.");
    const page = `https://www.youtube.com/${parts[0] === "c" || parts[0] === "user" ? `${parts[0]}/${parts[1]}` : parts[0]}`;
    const html = await fetchHtml(page);
    const id =
      html.match(/<meta itemprop="identifier" content="(UC[\w-]{22})"/)?.[1] ??
      html.match(/"externalId":"(UC[\w-]{22})"/)?.[1] ??
      html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/)?.[1] ??
      html.match(/"channelId":"(UC[\w-]{22})"/)?.[1];
    if (!id) throw new Error("Couldn't find that YouTube channel.");
    const label = decode(html.match(/<meta property="og:title" content="([^"]+)"/)?.[1] ?? parts[0]);
    return { platform: "youtube", external_id: id, label, url: page };
  }

  if (host === "vimeo.com") {
    const user = parts[0];
    if (!user || /^\d+$/.test(user) || ["channels", "groups", "showcase", "album"].includes(user)) throw new Error("Paste your Vimeo profile link, like vimeo.com/yourname.");
    return { platform: "vimeo", external_id: user, label: user, url: `https://vimeo.com/${user}` };
  }

  throw new Error("Channel import works with YouTube and Vimeo. For TikTok or Instagram, paste video links below.");
}

/** Parse YouTube's channel Atom feed. */
export function parseYouTubeFeed(xml: string): FoundVideo[] {
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].flatMap(([, e]) => {
    const id = e.match(/<yt:videoId>([\w-]{11})<\/yt:videoId>/)?.[1];
    if (!id) return [];
    return [{
      provider: "youtube" as const,
      id,
      url: `https://www.youtube.com/watch?v=${id}`,
      title: decode(e.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "Untitled"),
      thumbnail_url: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      published_at: e.match(/<published>([^<]+)<\/published>/)?.[1] ?? null,
    }];
  });
}

async function listYouTube(channelId: string, keys: SyncKeys): Promise<FoundVideo[]> {
  if (keys.youtubeApiKey) {
    const playlist = `UU${channelId.slice(2)}`;
    const out: FoundVideo[] = [];
    let pageToken = "";
    for (let page = 0; page < 10; page++) {
      const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlist}&key=${keys.youtubeApiKey}${pageToken ? `&pageToken=${pageToken}` : ""}`;
      const data = JSON.parse(await fetchText(url)) as {
        nextPageToken?: string;
        items?: { snippet: { title: string; publishedAt: string; resourceId: { videoId: string }; thumbnails?: Record<string, { url: string }> } }[];
      };
      for (const it of data.items ?? []) {
        const id = it.snippet.resourceId.videoId;
        const thumbs = it.snippet.thumbnails ?? {};
        out.push({
          provider: "youtube", id, url: `https://www.youtube.com/watch?v=${id}`, title: it.snippet.title,
          thumbnail_url: (thumbs.high ?? thumbs.medium ?? thumbs.default)?.url ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
          published_at: it.snippet.publishedAt,
        });
      }
      if (!data.nextPageToken) break;
      pageToken = data.nextPageToken;
    }
    return out;
  }
  return parseYouTubeFeed(await fetchText(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`));
}

async function listVimeo(user: string, keys: SyncKeys): Promise<FoundVideo[]> {
  const out: FoundVideo[] = [];
  if (keys.vimeoToken) {
    let next: string | null = `/users/${encodeURIComponent(user)}/videos?per_page=100&fields=uri,name,link,created_time,pictures.base_link`;
    for (let page = 0; page < 5 && next; page++) {
      const data = JSON.parse(await fetchText(`https://api.vimeo.com${next}`, { headers: { Authorization: `bearer ${keys.vimeoToken}` } })) as {
        paging?: { next: string | null };
        data: { uri: string; name: string; link: string; created_time: string; pictures?: { base_link?: string } }[];
      };
      for (const v of data.data) {
        const id = v.uri.split("/").pop()!;
        out.push({ provider: "vimeo", id, url: v.link, title: v.name, thumbnail_url: v.pictures?.base_link ? `${v.pictures.base_link}_640x360` : null, published_at: v.created_time });
      }
      next = data.paging?.next ?? null;
    }
    return out;
  }
  for (let page = 1; page <= 3; page++) {
    const list = JSON.parse(await fetchText(`https://vimeo.com/api/v2/${encodeURIComponent(user)}/videos.json?page=${page}`)) as {
      id: number; title: string; url: string; upload_date: string; thumbnail_large?: string;
    }[];
    for (const v of list) {
      out.push({
        provider: "vimeo", id: String(v.id), url: v.url.replace(/^http:/, "https:"), title: v.title,
        thumbnail_url: v.thumbnail_large?.replace(/^http:/, "https:") ?? null,
        published_at: v.upload_date ? new Date(v.upload_date.replace(" ", "T") + "Z").toISOString() : null,
      });
    }
    if (list.length < 20) break;
  }
  return out;
}

export async function listSourceVideos(source: Pick<ResolvedSource, "platform" | "external_id">, keys: SyncKeys = {}): Promise<FoundVideo[]> {
  return source.platform === "youtube" ? listYouTube(source.external_id, keys) : listVimeo(source.external_id, keys);
}
