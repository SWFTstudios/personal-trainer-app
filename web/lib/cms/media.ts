export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const SIGNATURES: { ext: "jpg" | "png" | "gif" | "webp"; type: string; test: (b: Uint8Array) => boolean }[] = [
  { ext: "jpg", type: "image/jpeg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: "png", type: "image/png", test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { ext: "gif", type: "image/gif", test: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38 },
  {
    ext: "webp",
    type: "image/webp",
    test: (b) => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  },
];

/** Detect the image type from file bytes, ignoring the client-supplied type. SVG is rejected on purpose. */
export function sniffImage(bytes: Uint8Array): { ext: string; type: string } | null {
  const match = SIGNATURES.find((s) => bytes.length >= 12 && s.test(bytes));
  return match ? { ext: match.ext, type: match.type } : null;
}

export const mediaUrl = (r2Key: string) => `/media/${r2Key}`;

export const MAX_VIDEO_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB
/** R2 multipart parts must be ≥5 MB (except the last) and the same size. */
export const VIDEO_CHUNK_BYTES = 10 * 1024 * 1024;

/** MP4/MOV/M4V (ISO BMFF "ftyp" box) or WebM (EBML header). */
export function sniffVideo(bytes: Uint8Array): { ext: "mp4" | "mov" | "webm"; type: string } | null {
  if (bytes.length >= 12 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    return brand === "qt  " ? { ext: "mov", type: "video/quicktime" } : { ext: "mp4", type: "video/mp4" };
  }
  if (bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) return { ext: "webm", type: "video/webm" };
  return null;
}

/** Parse a single "bytes=start-end" range against an object size. */
export function parseRange(header: string | null, size: number): { offset: number; length: number } | null {
  const m = header?.match(/^bytes=(\d*)-(\d*)$/);
  if (!m || (!m[1] && !m[2])) return null;
  let start: number;
  let end: number;
  if (!m[1]) {
    start = Math.max(0, size - Number(m[2]));
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
  }
  if (start > end || start >= size) return null;
  return { offset: start, length: end - start + 1 };
}
