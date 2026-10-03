import { notFound } from "next/navigation";
import { brandStyle } from "@/lib/brand";
import { productName } from "@/lib/env";
import { getPublishedTrainer } from "@/lib/trainer";

export default async function TrainerSiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const trainer = await getPublishedTrainer(slug);
  if (!trainer) notFound();

  return (
    <div style={brandStyle(trainer.accent_color_hex)}>
      {children}
      {trainer.plan !== "pro" && (
        <footer className="site-footer muted small">
          Powered by <a href="/">{productName}</a>
        </footer>
      )}
    </div>
  );
}
