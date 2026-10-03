"use client";

import { useEffect, useState } from "react";
import type { ThemePref } from "@/lib/brand";
import { Icon } from "./Icon";

const OPTIONS: { value: ThemePref; label: string; icon: "sun" | "moon" | "monitor" }[] = [
  { value: "light", label: "Light", icon: "sun" },
  { value: "dark", label: "Dark", icon: "moon" },
  { value: "system", label: "Auto", icon: "monitor" },
];

function apply(theme: ThemePref) {
  const root = document.documentElement;
  if (theme === "system") delete root.dataset.theme;
  else root.dataset.theme = theme;
  document.cookie = `theme=${theme}; path=/; max-age=31536000; samesite=lax`;
}

/** Light / dark / auto switch. Saved in a cookie so the server renders the right theme next time. */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<ThemePref>("system");
  useEffect(() => {
    const t = document.documentElement.dataset.theme;
    setTheme(t === "light" || t === "dark" ? t : "system");
  }, []);

  if (compact) {
    const next: ThemePref = theme === "dark" ? "light" : "dark";
    return (
      <button type="button" className="icon-btn" aria-label={`Switch to ${next} theme`} onClick={() => { apply(next); setTheme(next); }}>
        <Icon name={theme === "dark" ? "sun" : "moon"} />
      </button>
    );
  }
  return (
    <div className="segmented" role="group" aria-label="Theme">
      {OPTIONS.map((o) => (
        <button key={o.value} type="button" aria-pressed={theme === o.value} onClick={() => { apply(o.value); setTheme(o.value); }}>
          <Icon name={o.icon} /> {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Applies a trainer's default theme before paint when the viewer hasn't chosen one.
 * `theme` is a validated enum, so inlining it is safe.
 */
export function ThemeDefault({ theme }: { theme: ThemePref }) {
  if (theme === "system") return null;
  const js = `(function(){if(!/(?:^|; )theme=/.test(document.cookie))document.documentElement.dataset.theme=${JSON.stringify(theme)};})();`;
  return <script dangerouslySetInnerHTML={{ __html: js }} />;
}
