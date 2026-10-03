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
