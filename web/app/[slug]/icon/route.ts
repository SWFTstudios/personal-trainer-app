import { accentFor, DEFAULT_ACCENT, normalizeHex, textOn } from "@/lib/brand";
import { getPublishedTrainer } from "@/lib/trainer";

const escapeXml = (s: string) => s.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** App icon fallback: the trainer's initials on their brand color. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const trainer = await getPublishedTrainer((await params).slug);
  if (!trainer) return new Response("Not found", { status: 404 });
  const bg = accentFor(normalizeHex(trainer.accent_color_hex) ?? DEFAULT_ACCENT, "#f7f7f5");
  const initials = (trainer.display_name ?? "C")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="${bg}"/><text x="256" y="256" dy=".35em" text-anchor="middle" font-family="Inter,system-ui,sans-serif" font-weight="800" font-size="200" fill="${textOn(bg)}">${escapeXml(initials)}</text></svg>`;
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=3600" } });
}
