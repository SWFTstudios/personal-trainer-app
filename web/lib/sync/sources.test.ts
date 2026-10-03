import { describe, expect, it } from "vitest";
import { parseYouTubeFeed, resolveSource } from "./sources";

const FEED = `<?xml version="1.0"?><feed xmlns:yt="http://www.youtube.com/xml/schemas/2015">
<entry><id>yt:video:dQw4w9WgXcQ</id><yt:videoId>dQw4w9WgXcQ</yt:videoId><title>Squat &amp; Hinge 101</title>
<published>2026-09-01T10:00:00+00:00</published></entry>
<entry><yt:videoId>abcdefghijk</yt:videoId><title>Desk mobility</title><published>2026-08-01T10:00:00+00:00</published></entry>
</feed>`;

describe("YouTube feed", () => {
  it("parses entries", () => {
    const videos = parseYouTubeFeed(FEED);
    expect(videos).toHaveLength(2);
    expect(videos[0]).toMatchObject({ provider: "youtube", id: "dQw4w9WgXcQ", title: "Squat & Hinge 101", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" });
    expect(videos[0].thumbnail_url).toContain("dQw4w9WgXcQ");
  });
});

describe("resolveSource", () => {
  const html = `<meta property="og:title" content="Jane Fit"><meta itemprop="identifier" content="UCabcdefghijklmnopqrstuv">`;
  const fetchHtml = async () => html;

  it("resolves @handles and channel URLs", async () => {
    await expect(resolveSource("@janefit", fetchHtml)).resolves.toMatchObject({ platform: "youtube", external_id: "UCabcdefghijklmnopqrstuv", label: "Jane Fit" });
    await expect(resolveSource("https://www.youtube.com/@janefit/videos", fetchHtml)).resolves.toMatchObject({ external_id: "UCabcdefghijklmnopqrstuv" });
    await expect(resolveSource("https://youtube.com/channel/UCabcdefghijklmnopqrstuv")).resolves.toMatchObject({ external_id: "UCabcdefghijklmnopqrstuv" });
  });

  it("resolves Vimeo profiles and rejects video links and other platforms", async () => {
    await expect(resolveSource("vimeo.com/janefit")).resolves.toMatchObject({ platform: "vimeo", external_id: "janefit" });
    await expect(resolveSource("https://vimeo.com/123456")).rejects.toThrow(/profile/);
    await expect(resolveSource("https://www.tiktok.com/@jane")).rejects.toThrow(/paste video links/);
  });
});
