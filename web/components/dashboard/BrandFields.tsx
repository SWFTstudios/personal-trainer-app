"use client";

import { useState } from "react";
import { accentFor, textOn, type CornerStyle, type FontStyle, type ThemePref } from "@/lib/brand";

const FONTS: { value: FontStyle; label: string; family: string }[] = [
  { value: "modern", label: "Modern", family: "var(--font-sans)" },
  { value: "editorial", label: "Editorial", family: "var(--font-serif)" },
  { value: "athletic", label: "Athletic", family: "var(--font-condensed)" },
];
const CORNERS: { value: CornerStyle; label: string; radius: number }[] = [
  { value: "rounded", label: "Rounded", radius: 18 },
  { value: "soft", label: "Soft", radius: 9 },
  { value: "sharp", label: "Sharp", radius: 2 },
];
const THEMES: { value: ThemePref; label: string }[] = [
  { value: "system", label: "Match device" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

/** Brand controls with a live preview of the app in light and dark mode. */
export function BrandFields(props: { accent: string; font: FontStyle; corners: CornerStyle; theme: ThemePref; name: string }) {
  const [accent, setAccent] = useState(props.accent);
  const [font, setFont] = useState(props.font);
  const [corners, setCorners] = useState(props.corners);
  const [theme, setTheme] = useState(props.theme);
  const radius = CORNERS.find((c) => c.value === corners)!.radius;
  const family = FONTS.find((f) => f.value === font)!.family;

  const preview = (bg: string, surface: string, text: string, label: string) => {
    const a = accentFor(accent, bg);
    return (
      <div style={{ background: bg, color: text, borderRadius: radius + 4, padding: 14, border: "1px solid rgba(127,127,127,.25)", flex: 1, minWidth: 140 }}>
        <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 6 }}>{label}</div>
        <div style={{ fontFamily: family, fontWeight: 700, fontSize: 20, lineHeight: 1.1, marginBottom: 10 }}>{props.name || "Your brand"}</div>
        <div style={{ background: surface, borderRadius: radius, padding: 10, marginBottom: 10, fontSize: 13 }}>Upper body · 5 exercises</div>
        <div style={{ background: a, color: textOn(a), borderRadius: radius >= 18 ? 999 : radius, padding: "10px 12px", textAlign: "center", fontWeight: 700, fontSize: 14 }}>Book a session</div>
      </div>
    );
  };

  return (
    <div className="stack">
      <div className="row" style={{ alignItems: "flex-end" }}>
        <div>
          <label htmlFor="accent_color_hex">Brand color</label>
          <input id="accent_color_hex" name="accent_color_hex" type="color" value={accent} onChange={(e) => setAccent(e.target.value)} style={{ width: 72, height: 48 }} />
        </div>
        <p className="hint grow" style={{ margin: 0 }}>We adjust it slightly in each theme if needed so buttons stay readable.</p>
      </div>

      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: 6 }}>Headline font</legend>
        <div className="segmented">
          {FONTS.map((f) => (
            <label key={f.value} style={{ margin: 0, fontFamily: f.family, cursor: "pointer" }} aria-pressed={font === f.value}>
              <input type="radio" name="font_style" value={f.value} checked={font === f.value} onChange={() => setFont(f.value)} className="visually-hidden" />
              {f.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: 6 }}>Corners</legend>
        <div className="segmented">
          {CORNERS.map((c) => (
            <label key={c.value} style={{ margin: 0, cursor: "pointer" }} aria-pressed={corners === c.value}>
              <input type="radio" name="corner_style" value={c.value} checked={corners === c.value} onChange={() => setCorners(c.value)} className="visually-hidden" />
              {c.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: 6 }}>Default theme for visitors</legend>
        <div className="segmented">
          {THEMES.map((t) => (
            <label key={t.value} style={{ margin: 0, cursor: "pointer" }} aria-pressed={theme === t.value}>
              <input type="radio" name="theme_default" value={t.value} checked={theme === t.value} onChange={() => setTheme(t.value)} className="visually-hidden" />
              {t.label}
            </label>
          ))}
        </div>
        <p className="hint">Visitors can still switch between light and dark.</p>
      </fieldset>

      <div className="row" aria-label="Preview">
        {preview("#f7f7f5", "#ffffff", "#15151a", "Light")}
        {preview("#0e0e11", "#17171c", "#f3f3f1", "Dark")}
      </div>
    </div>
  );
}
