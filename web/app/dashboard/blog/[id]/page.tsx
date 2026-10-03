import Link from "next/link";
import { notFound } from "next/navigation";
import { PostEditor } from "@/components/dashboard/PostEditor";
import { first } from "@/lib/db";
import { getMediaLibrary, liveSiteBase } from "@/lib/dashboard";
import { requireTrainer } from "@/lib/trainer";
import type { Post } from "@/lib/types";
import { deletePost } from "../../cms-actions";

export default async function EditPost({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trainer = await requireTrainer();
  const post = await first<Post>("SELECT * FROM posts WHERE id = ? AND trainer_id = ?", id, trainer.id);
  if (!post) notFound();
  const library = await getMediaLibrary(trainer.id);
  return (
    <>
      <Link href="/dashboard/blog" className="muted small">← Blog</Link>
      <PostEditor post={post} siteBase={liveSiteBase(trainer)} library={library} />
      <form action={deletePost.bind(null, post.id)}><button className="btn btn-danger btn-sm">Delete post</button></form>
    </>
  );
}
