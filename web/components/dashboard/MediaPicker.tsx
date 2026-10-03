"use client";

import { useState, useTransition } from "react";
import { uploadMedia } from "@/app/dashboard/cms-actions";

export type MediaItem = { id: string; url: string; alt: string | null; filename: string };

type Props = {
  value: string;
  onChange: (url: string) => void;
  library: MediaItem[];
  onUploaded?: (item: MediaItem) => void;
  label?: string;
};

/** Image field: shows the current image and opens the media library to pick or upload one. */
export function MediaPicker({ value, onChange, library, onUploaded, label = "Image" }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <label>{label}</label>
      <div className="row">
        {value ? (
          <img src={value} alt="" style={{ width: 96, height: 64, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border)" }} />
        ) : (
          <span className="muted small">No image</span>
        )}
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>{value ? "Change" : "Choose"}</button>
        {value && <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange("")}>Remove</button>}
      </div>
      {open && (
        <MediaDialog
          library={library}
          onClose={() => setOpen(false)}
          onPick={(url) => {
            onChange(url);
            setOpen(false);
          }}
          onUploaded={onUploaded}
        />
      )}
    </div>
  );
}

export function MediaDialog({
  library,
  onPick,
  onClose,
  onUploaded,
}: {
  library: MediaItem[];
  onPick: (url: string) => void;
  onClose: () => void;
  onUploaded?: (item: MediaItem) => void;
}) {
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function upload(file: File) {
    const data = new FormData();
    data.set("file", file);
    setError("");
    start(async () => {
      const result = await uploadMedia(data);
      if (!result.ok) return setError(result.error);
      onUploaded?.({ id: result.id, url: result.url, alt: null, filename: file.name });
      onPick(result.url);
    });
  }

  return (
    <div className="dialog" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="stack" onClick={(e) => e.stopPropagation()}>
        <div className="row spread">
          <h3 style={{ margin: 0 }}>Media library</h3>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
        </div>
        <label className="btn btn-sm" style={{ width: "fit-content" }}>
          {pending ? "Uploading…" : "Upload image"}
          <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" hidden disabled={pending}
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </label>
        {error && <p className="error">{error}</p>}
        {library.length === 0 ? (
          <p className="muted">No images yet. Upload one to get started.</p>
        ) : (
          <div className="media-grid">
            {library.map((m) => (
              <button key={m.id} type="button" className="media-pick" onClick={() => onPick(m.url)} title={m.filename}>
                <img src={m.url} alt={m.alt ?? ""} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
