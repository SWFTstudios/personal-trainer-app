import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/lib/cms/markdown";
import { getPublishedPost } from "@/lib/site";
import { getPublishedTrainer } from "@/lib/trainer";

type Props = { params: Promise<{ slug: string; post: string }> };

async function load(params: Props["params"]) {
  const { slug, post: postSlug } = await params;
  const trainer = await getPublishedTrainer(slug);
  if (!trainer) return null;
  const post = await getPublishedPost(trainer.id, postSlug);
  return post ? { trainer, post } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await load(params);
  if (!data) return {};
  return {
    title: `${data.post.title} · ${data.trainer.display_name ?? ""}`,
    description: data.post.excerpt ?? undefined,
    openGraph: { images: data.post.cover_url ? [data.post.cover_url] : undefined },
  };
}

export default async function BlogPost({ params }: Props) {
  const data = await load(params);
  if (!data) notFound();
  const { trainer, post } = data;
  return (
    <main className="container narrow" style={{ padding: "48px 16px" }}>
      <Link href={`/${trainer.slug}/blog`} className="muted small">← Blog</Link>
      <article className="prose" style={{ marginTop: 16 }}>
        <h1>{post.title}</h1>
        {post.published_at && <p className="muted small">{new Date(post.published_at).toLocaleDateString("en-US", { dateStyle: "long" })}</p>}
        {post.cover_url && <img src={post.cover_url} alt="" style={{ width: "100%", borderRadius: "var(--radius)", margin: "8px 0 24px" }} />}
        <Markdown source={post.body} />
      </article>
      <div className="card cta stack" style={{ marginTop: 40 }}>
        <h3 style={{ margin: 0 }}>Train with {trainer.display_name}</h3>
        <Link className="btn" href={`/${trainer.slug}/book`}>Book a session</Link>
      </div>
    </main>
  );
}
