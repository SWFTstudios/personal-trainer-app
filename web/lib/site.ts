import "server-only";
import { cache } from "react";
import { all, first } from "@/lib/db";
import { getActiveServices } from "@/lib/booking";
import { toPage, type Page } from "@/lib/rows";
import type { Post } from "@/lib/types";

export type NavLink = { href: string; label: string };

/** Data shared by every page of a trainer's public site. */
export const getSiteChrome = cache(async (trainerId: string, slug: string) => {
  const [pages, postCount, services] = await Promise.all([
    all<{ path: string; title: string }>(
      "SELECT path, title FROM pages WHERE trainer_id = ? AND published = 1 AND show_in_nav = 1 AND path <> '' ORDER BY sort_order, created_at",
      trainerId,
    ),
    first<{ n: number }>("SELECT COUNT(*) AS n FROM posts WHERE trainer_id = ? AND status = 'published'", trainerId),
    getActiveServices(trainerId),
  ]);
  const nav: NavLink[] = pages.map((p) => ({ href: `/${slug}/${p.path}`, label: p.title }));
  if ((postCount?.n ?? 0) > 0) nav.push({ href: `/${slug}/blog`, label: "Blog" });
  return { nav, services };
});

export async function getPublishedPage(trainerId: string, path: string): Promise<Page | null> {
  const row = await first<Parameters<typeof toPage>[0]>(
    "SELECT * FROM pages WHERE trainer_id = ? AND path = ? AND published = 1",
    trainerId,
    path,
  );
  return row ? toPage(row) : null;
}

export async function getPublishedPosts(trainerId: string): Promise<Post[]> {
  return all<Post>(
    "SELECT * FROM posts WHERE trainer_id = ? AND status = 'published' ORDER BY published_at DESC LIMIT 100",
    trainerId,
  );
}

export async function getPublishedPost(trainerId: string, slug: string): Promise<Post | null> {
  return first<Post>("SELECT * FROM posts WHERE trainer_id = ? AND slug = ? AND status = 'published'", trainerId, slug);
}
