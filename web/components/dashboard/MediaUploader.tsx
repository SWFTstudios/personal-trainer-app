"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadMedia } from "@/app/dashboard/cms-actions";

export function MediaUploader() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function upload(files: FileList) {
    setError("");
    start(async () => {
      for (const file of Array.from(files)) {
        const data = new FormData();
        data.set("file", file);
        const result = await uploadMedia(data);
        if (!result.ok) {
          setError(`${file.name}: ${result.error}`);
          break;
        }
      }
      router.refresh();
    });
  }

  return (
    <div className="card row spread">
      <span className="muted">JPEG, PNG, GIF or WebP, up to 5 MB each.</span>
      <label className="btn">
        {pending ? "Uploading…" : "Upload images"}
        <input type="file" multiple accept="image/jpeg,image/png,image/gif,image/webp" hidden disabled={pending}
          onChange={(e) => e.target.files?.length && upload(e.target.files)} />
      </label>
      {error && <p className="error" style={{ width: "100%", margin: 0 }}>{error}</p>}
    </div>
  );
}
