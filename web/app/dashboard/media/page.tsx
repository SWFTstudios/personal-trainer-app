import { MediaUploader } from "@/components/dashboard/MediaUploader";
import { mediaUrl } from "@/lib/cms/media";
import { all } from "@/lib/db";
import { requireTrainer } from "@/lib/trainer";
import type { Media } from "@/lib/types";
import { deleteMedia, updateMediaAlt } from "../cms-actions";

export default async function MediaPage() {
  const trainer = await requireTrainer();
  const media = await all<Media>("SELECT * FROM media WHERE trainer_id = ? ORDER BY created_at DESC", trainer.id);
  const totalMb = media.reduce((n, m) => n + m.size_bytes, 0) / 1024 / 1024;

  return (
    <>
      <h1>Media</h1>
      <p className="muted">{media.length} images · {totalMb.toFixed(1)} MB. Stored on Cloudflare R2.</p>
      <MediaUploader />
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
        {media.map((m) => (
          <div key={m.id} className="card stack" style={{ padding: 12 }}>
            <a href={mediaUrl(m.r2_key)} target="_blank"><img src={mediaUrl(m.r2_key)} alt={m.alt ?? ""} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 8 }} /></a>
            <div className="small muted" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.filename}</div>
            <form action={updateMediaAlt.bind(null, m.id)} className="row" style={{ flexWrap: "nowrap", gap: 6 }}>
              <input name="alt" defaultValue={m.alt ?? ""} placeholder="Alt text" aria-label="Alt text" />
              <button className="btn btn-ghost btn-sm">Save</button>
            </form>
            <form action={deleteMedia.bind(null, m.id)}><button className="btn btn-danger btn-sm">Delete</button></form>
          </div>
        ))}
      </div>
    </>
  );
}
