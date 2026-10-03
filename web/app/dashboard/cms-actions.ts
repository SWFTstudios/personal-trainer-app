"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { BlocksSchema, defaultHomeBlocks, imageUrl, PAGE_PATH_RE, RESERVED_PAGE_PATHS } from "@/lib/cms/blocks";
import { MAX_UPLOAD_BYTES, mediaUrl, sniffImage } from "@/lib/cms/media";
import { all, bindings, first, isDbError, newId, nowIso, run } from "@/lib/db";
import { requireTrainer } from "@/lib/trainer";

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 50).replace(/^-|-$/g, "");

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

export async function createPage(formData: FormData) {
  const trainer = await requireTrainer();
  const isHome = formData.get("home") === "1";
  const title = String(formData.get("title") ?? "").trim().slice(0, 100) || (isHome ? "Home" : "");
  if (!title) redirect("/dashboard/pages?error=" + encodeURIComponent("Give the page a title."));

  let path = isHome ? "" : slugify(title) || "page";
  if (!isHome && RESERVED_PAGE_PATHS.has(path)) path = `${path}-page`;
  const blocks = isHome ? defaultHomeBlocks(trainer) : [];
  const id = newId();
  try {
    await run(
      "INSERT INTO pages (id, trainer_id, path, title, blocks, sort_order) VALUES (?, ?, ?, ?, ?, (SELECT COUNT(*) FROM pages WHERE trainer_id = ?))",
      id, trainer.id, path, title, JSON.stringify(blocks), trainer.id,
    );
  } catch (e) {
    if (isDbError(e, "UNIQUE constraint failed")) {
      redirect("/dashboard/pages?error=" + encodeURIComponent(isHome ? "You already have a home page." : "A page with that link exists."));
    }
    throw e;
  }
  redirect(`/dashboard/pages/${id}`);
}

const PageInput = z.object({
  title: z.string().trim().min(1, "Title is required").max(100),
  path: z.string().trim().toLowerCase(),
  seo_description: z.string().trim().max(300),
  published: z.boolean(),
  show_in_nav: z.boolean(),
  blocks: BlocksSchema,
});

export async function savePage(id: string, input: unknown): Promise<ActionResult> {
  const trainer = await requireTrainer();
  const parsed = PageInput.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: `${issue.path.join(" › ")}: ${issue.message}` };
  }
  const page = await first<{ path: string }>("SELECT path FROM pages WHERE id = ? AND trainer_id = ?", id, trainer.id);
  if (!page) return { ok: false, error: "Page not found." };

  const p = parsed.data;
  // The home page keeps its empty path.
  const path = page.path === "" ? "" : p.path;
  if (page.path !== "" && (!PAGE_PATH_RE.test(path) || RESERVED_PAGE_PATHS.has(path))) {
    return { ok: false, error: "Page link must be lowercase letters, numbers and dashes, and not book, blog or media." };
  }
  try {
    await run(
      `UPDATE pages SET title = ?, path = ?, seo_description = ?, published = ?, show_in_nav = ?, blocks = ?, updated_at = ?
       WHERE id = ? AND trainer_id = ?`,
      p.title, path, p.seo_description || null, p.published ? 1 : 0, p.show_in_nav ? 1 : 0, JSON.stringify(p.blocks), nowIso(), id, trainer.id,
    );
  } catch (e) {
    if (isDbError(e, "UNIQUE constraint failed")) return { ok: false, error: "Another page already uses that link." };
    throw e;
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deletePage(id: string) {
  const trainer = await requireTrainer();
  await run("DELETE FROM pages WHERE id = ? AND trainer_id = ?", id, trainer.id);
  revalidatePath("/", "layout");
  redirect("/dashboard/pages");
}

export async function movePage(id: string, direction: -1 | 1) {
  const trainer = await requireTrainer();
  const pages = await all<{ id: string }>("SELECT id FROM pages WHERE trainer_id = ? ORDER BY sort_order, created_at", trainer.id);
  const i = pages.findIndex((p) => p.id === id);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= pages.length) return;
  [pages[i], pages[j]] = [pages[j], pages[i]];
  const { DB } = await bindings();
  await DB.batch(pages.map((p, n) => DB.prepare("UPDATE pages SET sort_order = ? WHERE id = ?").bind(n, p.id)));
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// Blog posts
// ---------------------------------------------------------------------------

export async function createPost() {
  const trainer = await requireTrainer();
  const id = newId();
  await run("INSERT INTO posts (id, trainer_id, slug, title) VALUES (?, ?, ?, ?)", id, trainer.id, `draft-${id.slice(0, 8)}`, "Untitled post");
  redirect(`/dashboard/blog/${id}`);
}

const PostInput = z.object({
  title: z.string().trim().min(1, "Title is required").max(160),
  slug: z.string().trim().toLowerCase().regex(PAGE_PATH_RE, "Link must be lowercase letters, numbers and dashes"),
  excerpt: z.string().trim().max(400),
  body: z.string().max(100_000),
  cover_url: imageUrl,
  status: z.enum(["draft", "published"]),
});

export async function savePost(id: string, input: unknown): Promise<ActionResult> {
  const trainer = await requireTrainer();
  const parsed = PostInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const p = parsed.data;
  try {
    const result = await run(
      `UPDATE posts SET title = ?, slug = ?, excerpt = ?, body = ?, cover_url = ?, status = ?,
         published_at = CASE WHEN ? = 'published' THEN COALESCE(published_at, ?) ELSE published_at END, updated_at = ?
       WHERE id = ? AND trainer_id = ?`,
      p.title, p.slug, p.excerpt || null, p.body, p.cover_url || null, p.status, p.status, nowIso(), nowIso(), id, trainer.id,
    );
    if (!result.meta.changes) return { ok: false, error: "Post not found." };
  } catch (e) {
    if (isDbError(e, "UNIQUE constraint failed")) return { ok: false, error: "Another post already uses that link." };
    throw e;
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deletePost(id: string) {
  const trainer = await requireTrainer();
  await run("DELETE FROM posts WHERE id = ? AND trainer_id = ?", id, trainer.id);
  revalidatePath("/", "layout");
  redirect("/dashboard/blog");
}

// ---------------------------------------------------------------------------
// Media library (R2)
// ---------------------------------------------------------------------------

export type UploadResult = { ok: true; url: string; id: string } | { ok: false; error: string };

export async function uploadMedia(formData: FormData): Promise<UploadResult> {
  const trainer = await requireTrainer();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose an image to upload." };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: "Images must be 5 MB or smaller." };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffImage(bytes);
  if (!kind) return { ok: false, error: "Only JPEG, PNG, GIF or WebP images are supported." };

  const id = newId();
  const key = `${trainer.id}/${id}.${kind.ext}`;
  const { MEDIA } = await bindings();
  await MEDIA.put(key, bytes, { httpMetadata: { contentType: kind.type } });
  await run(
    "INSERT INTO media (id, trainer_id, r2_key, filename, content_type, size_bytes) VALUES (?, ?, ?, ?, ?, ?)",
    id, trainer.id, key, file.name.slice(0, 200), kind.type, file.size,
  );
  revalidatePath("/dashboard/media");
  return { ok: true, id, url: mediaUrl(key) };
}

export async function updateMediaAlt(id: string, formData: FormData) {
  const trainer = await requireTrainer();
  const alt = String(formData.get("alt") ?? "").trim().slice(0, 200) || null;
  await run("UPDATE media SET alt = ? WHERE id = ? AND trainer_id = ?", alt, id, trainer.id);
  revalidatePath("/dashboard/media");
}

export async function deleteMedia(id: string) {
  const trainer = await requireTrainer();
  const row = await first<{ r2_key: string }>("SELECT r2_key FROM media WHERE id = ? AND trainer_id = ?", id, trainer.id);
  if (!row) return;
  await (await bindings()).MEDIA.delete(row.r2_key);
  await run("DELETE FROM media WHERE id = ?", id);
  revalidatePath("/dashboard/media");
}
