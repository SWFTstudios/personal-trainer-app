"use client";

import { useState, useTransition } from "react";
import { savePost } from "@/app/dashboard/cms-actions";
import { Markdown } from "@/lib/cms/markdown";
import type { Post } from "@/lib/types";
import { MediaPicker, type MediaItem } from "./MediaPicker";

export function PostEditor({ post, siteBase, library: initialLibrary }: { post: Post; siteBase: string | null; library: MediaItem[] }) {
  const [form, setForm] = useState({
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt ?? "",
    body: post.body,
    cover_url: post.cover_url ?? "",
    status: post.status,
  });
  const [library, setLibrary] = useState(initialLibrary);
  const [preview, setPreview] = useState(false);
  const [status, setStatus] = useState<{ error?: string; saved?: boolean }>({});
  const [pending, start] = useTransition();
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setStatus({});
  };

  function save(nextStatus = form.status) {
    const payload = { ...form, status: nextStatus };
    setForm(payload);
    start(async () => {
      const result = await savePost(post.id, payload);
      setStatus(result.ok ? { saved: true } : { error: result.error });
    });
  }

  return (
    <div className="stack">
      <div className="row spread">
        <span className={`badge ${form.status === "published" ? "badge-ok" : ""}`}>{form.status === "published" ? "Published" : "Draft"}</span>
        <div className="row">
          {status.saved && <span className="muted small">Saved</span>}
          {siteBase && form.status === "published" && <a className="btn btn-ghost btn-sm" href={`${siteBase}/blog/${form.slug}`} target="_blank">View ↗</a>}
          <button type="button" className="btn btn-ghost" disabled={pending} onClick={() => save()}>Save</button>
          {form.status === "draft" ? (
            <button type="button" className="btn" disabled={pending} onClick={() => save("published")}>Publish</button>
          ) : (
            <button type="button" className="btn btn-ghost" disabled={pending} onClick={() => save("draft")}>Unpublish</button>
          )}
        </div>
      </div>
      {status.error && <p className="error">{status.error}</p>}
      <div className="card stack">
        <div><label htmlFor="title">Title</label><input id="title" value={form.title} onChange={(e) => set("title", e.target.value)} /></div>
        <div><label htmlFor="slug">Link</label><input id="slug" value={form.slug} onChange={(e) => set("slug", e.target.value.toLowerCase())} /></div>
        <div><label htmlFor="excerpt">Summary</label><textarea id="excerpt" rows={2} value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} /></div>
        <MediaPicker label="Cover image" value={form.cover_url} onChange={(v) => set("cover_url", v)} library={library}
          onUploaded={(item) => setLibrary((l) => [item, ...l])} />
      </div>
      <div className="card stack">
        <div className="row spread">
          <label style={{ margin: 0 }}>Body</label>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPreview((p) => !p)}>{preview ? "Edit" : "Preview"}</button>
        </div>
        {preview ? (
          <div className="prose"><Markdown source={form.body} /></div>
        ) : (
          <textarea rows={18} value={form.body} onChange={(e) => set("body", e.target.value)}
            placeholder={"Write here. Use ## for headings, - for lists, **bold**, [links](https://…)"} />
        )}
      </div>
    </div>
  );
}
