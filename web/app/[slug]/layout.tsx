import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ThemeDefault } from "@/components/ui/ThemeToggle";
import { brandStyle } from "@/lib/brand";
import { getPublishedTrainer } from "@/lib/trainer";

type Props = { children: React.ReactNode; params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const trainer = await getPublishedTrainer((await params).slug);
  if (!trainer) return {};
  const name = trainer.display_name ?? "Personal training";
  return {
    manifest: `/${trainer.slug}/manifest.webmanifest`,
    appleWebApp: { capable: true, title: name, statusBarStyle: "default" },
    icons: { apple: trainer.logo_url ?? `/${trainer.slug}/icon`, icon: trainer.logo_url ?? `/${trainer.slug}/icon` },
  };
}

/** Applies the trainer's brand (colors, fonts, corners, default theme) to everything under /<slug>. */
export default async function TrainerBrandLayout({ children, params }: Props) {
  const trainer = await getPublishedTrainer((await params).slug);
  if (!trainer) notFound();
  return (
    <div className="brand" style={brandStyle(trainer)}>
      <ThemeDefault theme={trainer.theme_default} />
      {children}
    </div>
  );
}
