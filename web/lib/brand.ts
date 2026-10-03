import type { CSSProperties } from "react";

const HEX = /^#?([0-9a-f]{6})$/i;

export function normalizeHex(value: string | null | undefined): string | null {
  const match = value?.trim().match(HEX);
  return match ? `#${match[1].toLowerCase()}` : null;
}

/** CSS variables that apply a trainer's accent color with a readable text color on top. */
export function brandStyle(accentHex: string | null | undefined): CSSProperties {
  const hex = normalizeHex(accentHex);
  if (!hex) return {};
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return { "--accent": hex, "--accent-text": luminance > 0.6 ? "#111111" : "#ffffff" } as CSSProperties;
}
