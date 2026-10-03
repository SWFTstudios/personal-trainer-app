import Link from "next/link";
import { all } from "@/lib/db";
import { liveSiteBase } from "@/lib/dashboard";
import { requireTrainer } from "@/lib/trainer";
import { createPage, movePage } from "../cms-actions";
import { Notice } from "../Notice";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function PagesPage({ searchParams }: Props) {
  const { error } = await searchParams;
  const trainer = await requireTrainer();
  const site = liveSiteBase(trainer);
  const pages = await all<{ id: string; path: string; title: string; published: number; show_in_nav: number; updated_at: string }>(
    "SELECT id, path, title, published, show_in_nav, updated_at FROM pages WHERE trainer_id = ? ORDER BY path <> '', sort_order, created_at",
    trainer.id,
  );
  const hasHome = pages.some((p) => p.path === "");

  return (
    <>
      <h1>Pages</h1>
      <p className="muted">Build your site from blocks: banners, text, photos, testimonials, FAQs and your services.</p>
      <Notice error={error} />
      {!hasHome && (
        <form action={createPage} className="card row spread">
          <input type="hidden" name="home" value="1" />
          <span>Your home page uses a simple default layout. Customise it with blocks.</span>
          <button className="btn btn-sm">Customise home page</button>
        </form>
      )}
      {pages.length > 0 && (
        <div className="card">
          {pages.map((p, i) => (
            <div key={p.id} className="row spread" style={{ padding: "10px 0", borderBottom: i < pages.length - 1 ? "1px solid var(--border)" : undefined }}>
              <div>
                <Link href={`/dashboard/pages/${p.id}`}><strong>{p.title}</strong></Link>
                <div className="small muted">
                  /{trainer.slug ?? "your-link"}{p.path ? `/${p.path}` : ""} · {p.published ? "Published" : "Draft"}
                  {p.path && !p.show_in_nav && " · hidden from menu"}
                </div>
              </div>
              <div className="row" style={{ gap: 4 }}>
                {p.path !== "" && (
                  <>
                    <form action={movePage.bind(null, p.id, -1)}><button className="btn btn-ghost btn-sm" aria-label="Move up">↑</button></form>
                    <form action={movePage.bind(null, p.id, 1)}><button className="btn btn-ghost btn-sm" aria-label="Move down">↓</button></form>
                  </>
                )}
                {site && p.published && <a className="btn btn-ghost btn-sm" href={`${site}${p.path ? `/${p.path}` : ""}`} target="_blank">View</a>}
                <Link className="btn btn-sm" href={`/dashboard/pages/${p.id}`}>Edit</Link>
              </div>
            </div>
          ))}
        </div>
      )}
      <form action={createPage} className="card row" style={{ alignItems: "flex-end" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label htmlFor="title">New page</label>
          <input id="title" name="title" placeholder="About, Pricing, Results…" required />
        </div>
        <button className="btn">Create page</button>
      </form>
    </>
  );
}
