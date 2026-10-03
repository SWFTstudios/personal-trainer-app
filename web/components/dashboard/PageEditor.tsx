"use client";

import { useState, useTransition } from "react";
import { savePage } from "@/app/dashboard/cms-actions";
import type { Block } from "@/lib/cms/blocks";
import { BlockEditor } from "./BlockEditor";
import type { MediaItem } from "./MediaPicker";

type Props = {
  page: { id: string; path: string; title: string; seo_description: string | null; published: boolean; show_in_nav: boolean; blocks: Block[] };
  siteBase: string | null;
  library: MediaItem[];
};

export function PageEditor({ page, siteBase, library: initialLibrary }: Props) {
  const isHome = page.path === "";
  const [title, setTitle] = useState(page.title);
  const [path, setPath] = useState(page.path);
  const [seo, setSeo] = useState(page.seo_description ?? "");
  const [published, setPublished] = useState(page.published);
  const [showInNav, setShowInNav] = useState(page.show_in_nav);
  const [blocks, setBlocks] = useState(page.blocks);
  const [library, setLibrary] = useState(initialLibrary);
  const [status, setStatus] = useState<{ error?: string; saved?: boolean }>({});
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();

  const touch = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setDirty(true);
    setStatus({});
  };

  function save() {
    start(async () => {
      const result = await savePage(page.id, { title, path, seo_description: seo, published, show_in_nav: showInNav, blocks });
      setStatus(result.ok ? { saved: true } : { error: result.error });
      if (result.ok) setDirty(false);
    });
  }

  const liveUrl = siteBase ? `${siteBase}${isHome ? "" : `/${path}`}` : null;

  return (
    <div className="stack">
      <div className="row spread" style={{ position: "sticky", top: 0, background: "var(--bg)", padding: "8px 0", zIndex: 5 }}>
        <h1 style={{ margin: 0 }}>{title || "Untitled"}</h1>
        <div className="row">
          {status.saved && !dirty && <span className="muted small">Saved</span>}
          {liveUrl && published && <a className="btn btn-ghost btn-sm" href={liveUrl} target="_blank">View ↗</a>}
          <button type="button" className="btn" onClick={save} disabled={pending}>{pending ? "Saving…" : "Save"}</button>
        </div>
      </div>
      {status.error && <p className="error">{status.error}</p>}

      <div className="card stack">
        <div>
          <label htmlFor="title">Title</label>
          <input id="title" value={title} onChange={(e) => touch(setTitle)(e.target.value)} />
        </div>
        {!isHome && (
          <div>
            <label htmlFor="path">Page link</label>
            <input id="path" value={path} onChange={(e) => touch(setPath)(e.target.value.toLowerCase())} />
          </div>
        )}
        <div>
          <label htmlFor="seo">Search description</label>
          <input id="seo" value={seo} maxLength={300} onChange={(e) => touch(setSeo)(e.target.value)} />
        </div>
        <div className="row">
          <label className="row" style={{ margin: 0 }}>
            <input type="checkbox" checked={published} onChange={(e) => touch(setPublished)(e.target.checked)} /> Published
          </label>
          {!isHome && (
            <label className="row" style={{ margin: 0 }}>
              <input type="checkbox" checked={showInNav} onChange={(e) => touch(setShowInNav)(e.target.checked)} /> Show in menu
            </label>
          )}
        </div>
      </div>

      <BlockEditor
        blocks={blocks}
        onChange={touch(setBlocks)}
        library={library}
        onUploaded={(item) => setLibrary((l) => [item, ...l])}
      />
    </div>
  );
}
