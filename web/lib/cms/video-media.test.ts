import { describe, expect, it } from "vitest";
import { parseRange, sniffVideo } from "./media";

const bytes = (...b: (number | string)[]) => new Uint8Array(b.flatMap((x) => (typeof x === "string" ? [...x].map((c) => c.charCodeAt(0)) : [x])));

describe("sniffVideo", () => {
  it("detects MP4, MOV and WebM", () => {
    expect(sniffVideo(bytes(0, 0, 0, 0x20, "ftyp", "isom", 0, 0))?.ext).toBe("mp4");
    expect(sniffVideo(bytes(0, 0, 0, 0x14, "ftyp", "qt  ", 0, 0))?.ext).toBe("mov");
    expect(sniffVideo(bytes(0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0))?.ext).toBe("webm");
  });
  it("rejects other files", () => {
    expect(sniffVideo(bytes("<html><body>hi</body>"))).toBeNull();
    expect(sniffVideo(bytes(0xff, 0xd8, 0xff, 0, 0, 0, 0, 0, 0, 0, 0, 0))).toBeNull();
  });
});

describe("parseRange", () => {
  it("handles open, closed and suffix ranges", () => {
    expect(parseRange("bytes=0-", 1000)).toEqual({ offset: 0, length: 1000 });
    expect(parseRange("bytes=100-199", 1000)).toEqual({ offset: 100, length: 100 });
    expect(parseRange("bytes=900-5000", 1000)).toEqual({ offset: 900, length: 100 });
    expect(parseRange("bytes=-100", 1000)).toEqual({ offset: 900, length: 100 });
  });
  it("rejects unsatisfiable or malformed ranges", () => {
    expect(parseRange("bytes=1000-", 1000)).toBeNull();
    expect(parseRange("bytes=5-1", 1000)).toBeNull();
    expect(parseRange("items=0-1", 1000)).toBeNull();
    expect(parseRange(null, 1000)).toBeNull();
  });
});
