import { accentFor, normalizeHex, DEFAULT_ACCENT } from "@/lib/brand";
import { getPublishedTrainer } from "@/lib/trainer";

// Per-trainer web app manifest, so each trainer's app installs with their own name and color.
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const trainer = await getPublishedTrainer((await params).slug);
  if (!trainer) return new Response("Not found", { status: 404 });
  const name = trainer.display_name ?? "My coach";
  const accent = accentFor(normalizeHex(trainer.accent_color_hex) ?? DEFAULT_ACCENT, "#f2f2ef");
  const icon = trainer.logo_url ?? `/${trainer.slug}/icon`;
  return Response.json(
    {
      id: `/${trainer.slug}/app`,
      name,
      short_name: name.length > 12 ? name.split(/\s+/)[0].slice(0, 12) : name,
      description: trainer.headline ?? `Training with ${name}`,
      start_url: `/${trainer.slug}/app`,
      scope: `/${trainer.slug}/`,
      display: "standalone",
      orientation: "portrait",
      background_color: trainer.theme_default === "dark" ? "#0b0b0d" : "#f2f2ef",
      theme_color: accent,
      icons: [
        { src: icon, sizes: "any", purpose: "any" },
        { src: `/${trainer.slug}/icon`, sizes: "any", type: "image/svg+xml", purpose: "maskable" },
      ],
      shortcuts: [
        { name: "Log a workout", url: `/${trainer.slug}/app/workouts/new` },
        { name: "Videos", url: `/${trainer.slug}/app/videos` },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=300" } },
  );
}
