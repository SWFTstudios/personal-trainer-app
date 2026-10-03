import Link from "next/link";
import { notFound } from "next/navigation";
import { VideoPlayer } from "@/components/app/VideoPlayer";
import { ImageField } from "@/components/dashboard/ImageField";
import { VideoMetaFields } from "@/components/dashboard/VideoMetaFields";
import { Icon } from "@/components/ui/Icon";
import { getVideoCategories } from "@/lib/app-data";
import { getMediaLibrary } from "@/lib/dashboard";
import { first } from "@/lib/db";
import { toVideo } from "@/lib/rows";
import { requireTrainer } from "@/lib/trainer";
import { PROVIDER_LABELS } from "@/lib/video";
import { getCollections, getVideoCollectionIds } from "@/lib/videos-admin";
import { deleteVideo, updateVideo } from "../../app-actions";
import { Notice } from "../../Notice";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; saved?: string; added?: string }> };

export default async function EditVideo({ params, searchParams }: Props) {
  const { id } = await params;
  const { error, saved, added } = await searchParams;
  const trainer = await requireTrainer();
  const row = await first<Parameters<typeof toVideo>[0]>("SELECT * FROM videos WHERE id = ? AND trainer_id = ?", id, trainer.id);
  if (!row) notFound();
  const v = toVideo(row);
  const [collections, categories, selected, library] = await Promise.all([
    getCollections(trainer.id), getVideoCategories(trainer.id), getVideoCollectionIds(v.id), getMediaLibrary(trainer.id),
  ]);

  return (
    <>
      <Link href="/dashboard/videos" className="row muted small" style={{ textDecoration: "none", gap: 4 }}><Icon name="back" width={18} height={18} /> Videos</Link>
      <Notice error={error} success={added ? "Video added. Edit its details below." : saved ? "Saved." : undefined} />
      <VideoPlayer provider={v.provider === "upload" ? "file" : v.provider} id={v.provider === "upload" ? v.url : v.provider_id} title={v.title} thumbnail={v.thumbnail_url} />
      <p className="small muted" style={{ margin: 0 }}>
        {PROVIDER_LABELS[v.provider]}
        {v.size_bytes ? ` · ${(v.size_bytes / 1e6).toFixed(1)} MB` : ""}
        {v.provider !== "upload" && <> · <a href={v.url} target="_blank" rel="noopener noreferrer">Open original</a></>}
      </p>
      <form action={updateVideo.bind(null, v.id)} className="stack">
        <div className="card stack">
          <div><label htmlFor="title">Name</label><input id="title" name="title" defaultValue={v.title} required maxLength={160} /></div>
          <div><label htmlFor="description">Description</label><textarea id="description" name="description" rows={4} defaultValue={v.description ?? ""} /></div>
          <VideoMetaFields categories={categories} collections={collections} category={v.category ?? ""} selected={selected} visibility={v.visibility} />
          <ImageField name="thumbnail_url" label="Thumbnail" defaultValue={v.thumbnail_url ?? ""} library={library} />
          <label className="check"><input type="checkbox" name="published" defaultChecked={v.published} /> Published</label>
        </div>
        <div className="save-bar row" style={{ flexWrap: "nowrap" }}>
          <button className="btn btn-danger" formAction={deleteVideo.bind(null, v.id)} formNoValidate>Delete</button>
          <button className="btn grow">Save</button>
        </div>
      </form>
    </>
  );
}
