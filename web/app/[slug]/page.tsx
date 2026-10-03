import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Blocks } from "@/components/site/Blocks";
import { defaultHomeBlocks } from "@/lib/cms/blocks";
import { getPublishedPage, getSiteChrome } from "@/lib/site";
import { getPublishedTrainer } from "@/lib/trainer";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const trainer = await getPublishedTrainer((await params).slug);
  if (!trainer) return {};
  const page = await getPublishedPage(trainer.id, "");
  const name = trainer.display_name ?? "Personal training";
  return {
    title: trainer.headline ? `${name} · ${trainer.headline}` : name,
    description: page?.seo_description ?? trainer.bio?.slice(0, 160) ?? undefined,
    openGraph: { images: trainer.hero_image_url ? [trainer.hero_image_url] : undefined },
  };
}

export default async function TrainerHome({ params }: Props) {
  const trainer = await getPublishedTrainer((await params).slug);
  if (!trainer) notFound();
  const [page, { services }] = await Promise.all([getPublishedPage(trainer.id, ""), getSiteChrome(trainer.id, trainer.slug)]);
  const blocks = page?.blocks.length ? page.blocks : defaultHomeBlocks(trainer);
  return <main><Blocks blocks={blocks} ctx={{ trainer, services }} /></main>;
}
