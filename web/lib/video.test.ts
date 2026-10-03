import { describe, expect, it } from "vitest";
import { embedUrl, parseVideoUrl } from "./video";

describe("parseVideoUrl", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10", "youtube", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ", "youtube", "dQw4w9WgXcQ"],
    ["https://youtube.com/shorts/dQw4w9WgXcQ", "youtube", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/live/dQw4w9WgXcQ?si=x", "youtube", "dQw4w9WgXcQ"],
    ["https://m.youtube.com/watch?v=dQw4w9WgXcQ", "youtube", "dQw4w9WgXcQ"],
    ["https://vimeo.com/76979871", "vimeo", "76979871"],
    ["https://vimeo.com/76979871/a1b2c3d4e5", "vimeo", "76979871:a1b2c3d4e5"],
    ["https://player.vimeo.com/video/76979871?h=abc123", "vimeo", "76979871:abc123"],
    ["https://www.tiktok.com/@coach/video/7212345678901234567", "tiktok", "7212345678901234567"],
    ["https://www.instagram.com/reel/C1a2B3c4D5e/", "instagram", "C1a2B3c4D5e"],
    ["https://www.loom.com/share/0123456789abcdef0123456789abcdef", "loom", "0123456789abcdef0123456789abcdef"],
    ["https://cdn.example.com/tips/squat.mp4", "file", "https://cdn.example.com/tips/squat.mp4"],
  ])("%s", (url, provider, id) => {
    expect(parseVideoUrl(url)).toMatchObject({ provider, id });
  });

  it.each(["http://youtube.com/watch?v=dQw4w9WgXcQ", "https://youtube.com/watch?v=bad", "javascript:alert(1)", "https://example.com/page", "not a url"])(
    "rejects %s",
    (url) => expect(parseVideoUrl(url)).toBeNull(),
  );

  it("builds privacy-friendly embed URLs", () => {
    expect(embedUrl("youtube", "dQw4w9WgXcQ")).toContain("youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(embedUrl("vimeo", "1:abc")).toBe("https://player.vimeo.com/video/1?autoplay=1&h=abc");
    expect(embedUrl("file", "x")).toBeNull();
  });
});
