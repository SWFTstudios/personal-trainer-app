"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadMedia } from "@/app/dashboard/cms-actions";
import { Icon } from "@/components/ui/Icon";

const MAX = 2 * 1024 * 1024 * 1024;

async function post<T>(action: string, body: unknown): Promise<T> {
  const res = await fetch(`/api/uploads/video?action=${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Upload failed (${res.status})`);
  return data;
}

/** Grab a frame ~1s in as a JPEG thumbnail. Resolves null if the browser can't decode the file. */
function captureThumbnail(url: string): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = url;
    const done = (b: Blob | null) => { video.removeAttribute("src"); resolve(b); };
    const timer = setTimeout(() => done(null), 8000);
    video.onloadedmetadata = () => { video.currentTime = Math.min(1, (video.duration || 2) / 3); };
    video.onseeked = () => {
      clearTimeout(timer);
      const scale = Math.min(1, 1280 / (video.videoWidth || 1280));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round((video.videoWidth || 1280) * scale);
      canvas.height = Math.round((video.videoHeight || 720) * scale);
      canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((b) => done(b), "image/jpeg", 0.82);
    };
    video.onerror = () => { clearTimeout(timer); done(null); };
  });
}

const formatBytes = (n: number) => (n > 1e9 ? `${(n / 1e9).toFixed(2)} GB` : `${(n / 1e6).toFixed(1)} MB`);

export function VideoUploader({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const abortRef = useRef<{ key: string; uploadId: string } | null>(null);
  const cancelled = useRef(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [stage, setStage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function choose(f: File | undefined) {
    setError("");
    if (!f) return;
    if (!/^video\//.test(f.type) && !/\.(mp4|mov|m4v|webm)$/i.test(f.name)) return setError("Choose an MP4, MOV or WebM video.");
    if (f.size > MAX) return setError("Videos must be 2 GB or smaller.");
    setFile(f);
    setTitle((t) => t || f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim());
    setPreview(URL.createObjectURL(f));
  }

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || !preview) return;
    const form = new FormData(event.currentTarget);
    setError("");
    cancelled.current = false;
    try {
      setStage("Preparing thumbnail…");
      setProgress(0);
      let thumbnail_url: string | null = null;
      const thumb = await captureThumbnail(preview);
      if (thumb) {
        const data = new FormData();
        data.set("file", new File([thumb], "thumbnail.jpg", { type: "image/jpeg" }));
        const r = await uploadMedia(data);
        if (r.ok) thumbnail_url = r.url;
      }

      setStage("Uploading…");
      const { key, uploadId, chunkSize } = await post<{ key: string; uploadId: string; chunkSize: number }>("create", { filename: file.name, size: file.size });
      abortRef.current = { key, uploadId };
      const total = Math.ceil(file.size / chunkSize);
      const parts: { partNumber: number; etag: string }[] = [];
      for (let i = 0; i < total; i++) {
        if (cancelled.current) throw new Error("Upload cancelled.");
        const chunk = file.slice(i * chunkSize, Math.min(file.size, (i + 1) * chunkSize));
        let lastError: unknown;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const res = await fetch(`/api/uploads/video?${new URLSearchParams({ key, uploadId, part: String(i + 1) })}`, { method: "PUT", body: chunk });
            const data = (await res.json()) as { partNumber: number; etag: string; error?: string };
            if (!res.ok) throw new Error(data.error ?? `Chunk failed (${res.status})`);
            parts.push({ partNumber: data.partNumber, etag: data.etag });
            lastError = null;
            break;
          } catch (e) {
            lastError = e;
            if (res415(e)) break;
            await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
          }
        }
        if (lastError) throw lastError;
        setProgress(Math.round(((i + 1) / total) * 100));
      }

      setStage("Finishing…");
      const { id } = await post<{ id: string }>("complete", {
        key, uploadId, parts, thumbnail_url,
        title: title.trim() || file.name,
        description: String(form.get("description") ?? ""),
        category: String(form.get("category") ?? ""),
        collections: form.getAll("collections").map(String),
        visibility: form.get("visibility") === "public" ? "public" : "members",
        notify: form.get("notify") === "on",
      });
      abortRef.current = null;
      router.push(`/dashboard/videos/${id}?added=1`);
      router.refresh();
    } catch (e) {
      if (abortRef.current) await post("abort", abortRef.current).catch(() => undefined);
      abortRef.current = null;
      setProgress(null);
      setStage("");
      setError(e instanceof Error ? e.message : "Upload failed.");
    }
  }

  const busy = progress !== null;
  return (
    <form ref={formRef} onSubmit={upload} className="stack">
      <label className="card" style={{ display: "grid", placeItems: "center", textAlign: "center", padding: 24, borderStyle: "dashed", cursor: busy ? "default" : "pointer" }}>
        {preview ? (
          <video src={preview} controls playsInline muted style={{ width: "100%", maxHeight: 360, borderRadius: "var(--radius-sm)", background: "#000" }} />
        ) : (
          <span className="stack-sm" style={{ display: "grid", placeItems: "center" }}>
            <span className="avatar" style={{ width: 56, height: 56 }}><Icon name="download" style={{ transform: "rotate(180deg)" }} /></span>
            <strong>Choose a video</strong>
            <span className="muted small">MP4, MOV or WebM up to 2 GB. On a phone you can record one now.</span>
          </span>
        )}
        <input type="file" accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.m4v,.webm" className="visually-hidden" disabled={busy} onChange={(e) => choose(e.target.files?.[0])} />
      </label>
      {file && <p className="small muted" style={{ margin: 0 }}>{file.name} · {formatBytes(file.size)}</p>}

      <div className="card stack">
        <div>
          <label htmlFor="v-title">Name</label>
          <input id="v-title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={160} />
        </div>
        <div><label htmlFor="v-desc">Description</label><textarea id="v-desc" name="description" rows={3} /></div>
        {children}
        <label className="check"><input type="checkbox" name="notify" defaultChecked /> Notify members when it's ready</label>
      </div>

      {error && <p className="error" role="alert">{error}</p>}
      {busy && (
        <div className="stack-sm" aria-live="polite">
          <div className="row spread small"><span>{stage}</span><span>{progress}%</span></div>
          <div style={{ height: 8, borderRadius: 99, background: "var(--surface-2)", overflow: "hidden" }}>
            <div style={{ width: `${progress}%`, height: "100%", background: "var(--accent)", transition: "width .2s" }} />
          </div>
        </div>
      )}
      <div className="save-bar row" style={{ flexWrap: "nowrap" }}>
        {busy && <button type="button" className="btn btn-ghost" onClick={() => { cancelled.current = true; }}>Cancel</button>}
        <button className="btn grow" disabled={!file || busy}><Icon name="download" style={{ transform: "rotate(180deg)" }} /> {busy ? "Uploading…" : "Upload video"}</button>
      </div>
    </form>
  );
}

// Don't retry when the server rejected the file type.
const res415 = (e: unknown) => e instanceof Error && /isn't an MP4/.test(e.message);
