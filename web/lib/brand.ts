import type { CSSProperties } from "react";

const HEX = /^#?([0-9a-f]{6})$/i;
export const DEFAULT_ACCENT = "#1f6f5c";

// Theme backgrounds the accent has to stand out against (keep in sync with globals.css).
const LIGHT_BG = "#f7f7f5";
const DARK_BG = "#0e0e11";

export type FontStyle = "modern" | "editorial" | "athletic";
export type CornerStyle = "rounded" | "soft" | "sharp";
export type ThemePref = "system" | "light" | "dark";

export function normalizeHex(value: string | null | undefined): string | null {
  const match = value?.trim().match(HEX);
  return match ? `#${match[1].toLowerCase()}` : null;
}

function rgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

function toHex([r, g, b]: number[]): string {
  return `#${[r, g, b].map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, "0")).join("")}`;
}

export function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function mix(hex: string, target: string, amount: number): string {
  const a = rgb(hex);
  const b = rgb(target);
  return toHex(a.map((c, i) => c + (b[i] - c) * amount));
}

/** Nudge an accent toward white or black until it reaches 3:1 against the background (WCAG UI contrast). */
export function accentFor(hex: string, background: string): string {
  const toward = luminance(background) > 0.5 ? "#000000" : "#ffffff";
  let color = hex;
  for (let step = 0; step < 20 && contrast(color, background) < 3; step++) color = mix(color, toward, 0.08);
  return color;
}

/** Black or white, whichever reads better on the given color. */
export function textOn(hex: string): string {
  return contrast(hex, "#ffffff") >= contrast(hex, "#111111") ? "#ffffff" : "#111111";
}

/**
 * CSS variables for a trainer's brand. Accent colors are adjusted separately for light and dark
 * themes so buttons and links stay legible in both; globals.css picks the right pair per theme.
 */
export function brandStyle(brand: {
  accent_color_hex?: string | null;
  font_style?: FontStyle | null;
  corner_style?: CornerStyle | null;
} | string | null | undefined): CSSProperties {
  const b = typeof brand === "string" || brand == null ? { accent_color_hex: brand } : brand;
  const hex = normalizeHex(b.accent_color_hex);
  const style: Record<string, string> = {};
  if (hex) {
    const light = accentFor(hex, LIGHT_BG);
    const dark = accentFor(hex, DARK_BG);
    style["--brand-light"] = light;
    style["--brand-light-text"] = textOn(light);
    style["--brand-dark"] = dark;
    style["--brand-dark-text"] = textOn(dark);
  }
  if (b.font_style === "editorial") style["--font-display"] = "var(--font-serif)";
  if (b.font_style === "athletic") style["--font-display"] = "var(--font-condensed)";
  if (b.corner_style === "soft") style["--radius-scale"] = "0.5";
  if (b.corner_style === "sharp") style["--radius-scale"] = "0.12";
  return style as CSSProperties;
}

export function parseTheme(value: string | null | undefined): ThemePref {
  return value === "light" || value === "dark" ? value : "system";
}
