import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedPosts } from "@/lib/site";
import { getPublishedTrainer } from "@/lib/trainer";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const trainer = await getPublishedTrainer((await params).slug);
  return trainer ? { title: `Blog · ${trainer.display_name ?? ""}` } : {};
}

export default async function BlogIndex({ params }: Props) {
  const trainer = await getPublishedTrainer((await params).slug);
  if (!trainer) notFound();
  const posts = await getPublishedPosts(trainer.id);
  return (
    <main className="container narrow" style={{ padding: "48px 16px" }}>
      <h1>Blog</h1>
      {posts.length === 0 && <p className="muted">No posts yet.</p>}
      <div className="stack">
        {posts.map((p) => (
          <Link key={p.id} href={`/${trainer.slug}/blog/${p.slug}`} className="card" style={{ display: "block", textDecoration: "none" }}>
            {p.cover_url && <img src={p.cover_url} alt="" style={{ width: "100%", aspectRatio: "16/7", objectFit: "cover", borderRadius: 10, marginBottom: 12 }} />}
            <h2 style={{ marginBottom: 4 }}>{p.title}</h2>
            <p className="muted small" style={{ margin: 0 }}>{p.published_at && new Date(p.published_at).toLocaleDateString("en-US", { dateStyle: "long" })}</p>
            {p.excerpt && <p style={{ marginTop: 8, marginBottom: 0 }}>{p.excerpt}</p>}
          </Link>
        ))}
      </div>
    </main>
  );
}
