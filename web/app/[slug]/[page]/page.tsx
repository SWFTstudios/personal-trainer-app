import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Blocks } from "@/components/site/Blocks";
import { getPublishedPage, getSiteChrome } from "@/lib/site";
import { getPublishedTrainer } from "@/lib/trainer";

type Props = { params: Promise<{ slug: string; page: string }> };

async function load(params: Props["params"]) {
  const { slug, page: path } = await params;
  const trainer = await getPublishedTrainer(slug);
  if (!trainer) return null;
  const page = await getPublishedPage(trainer.id, path);
  return page ? { trainer, page } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await load(params);
  if (!data) return {};
  return { title: `${data.page.title} · ${data.trainer.display_name ?? ""}`, description: data.page.seo_description ?? undefined };
}

export default async function TrainerPage({ params }: Props) {
  const data = await load(params);
  if (!data) notFound();
  const { services } = await getSiteChrome(data.trainer.id, data.trainer.slug);
  return (
    <main>
      {data.page.blocks[0]?.type !== "hero" && (
        <section className="container narrow" style={{ paddingTop: 48 }}><h1>{data.page.title}</h1></section>
      )}
      <Blocks blocks={data.page.blocks} ctx={{ trainer: data.trainer, services }} />
    </main>
  );
}
