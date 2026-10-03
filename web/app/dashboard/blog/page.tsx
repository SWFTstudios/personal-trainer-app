import Link from "next/link";
import { all } from "@/lib/db";
import { requireTrainer } from "@/lib/trainer";
import type { Post } from "@/lib/types";
import { createPost } from "../cms-actions";

export default async function BlogAdmin() {
  const trainer = await requireTrainer();
  const posts = await all<Post>("SELECT * FROM posts WHERE trainer_id = ? ORDER BY COALESCE(published_at, updated_at) DESC", trainer.id);
  return (
    <>
      <div className="row spread">
        <h1 style={{ margin: 0 }}>Blog</h1>
        <form action={createPost}><button className="btn">New post</button></form>
      </div>
      <p className="muted">Tips, client wins and announcements. Posts help people find you on Google.</p>
      {posts.length === 0 ? (
        <p className="muted">No posts yet.</p>
      ) : (
        <div className="card">
          {posts.map((p, i) => (
            <div key={p.id} className="row spread" style={{ padding: "10px 0", borderBottom: i < posts.length - 1 ? "1px solid var(--border)" : undefined }}>
              <div>
                <Link href={`/dashboard/blog/${p.id}`}><strong>{p.title}</strong></Link>
                <div className="small muted">
                  {p.status === "published" && p.published_at ? `Published ${new Date(p.published_at).toLocaleDateString("en-US", { dateStyle: "medium" })}` : "Draft"}
                </div>
              </div>
              <Link className="btn btn-sm" href={`/dashboard/blog/${p.id}`}>Edit</Link>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
