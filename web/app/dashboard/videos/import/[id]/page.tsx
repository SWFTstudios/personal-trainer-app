import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { relativeTime } from "@/lib/app-data";
import { all, first } from "@/lib/db";
import { listSourceVideos, type FoundVideo } from "@/lib/sync/sources";
import { requireTrainer } from "@/lib/trainer";
import type { VideoSource } from "@/lib/types";
import { getCollections } from "@/lib/videos-admin";
import { importFromSource, removeSource, updateSource } from "../../../app-actions";
import { Notice } from "../../../Notice";
import { SelectAll } from "./SelectAll";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; added?: string; saved?: string }> };

export default async function SourcePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { error, added, saved } = await searchParams;
  const trainer = await requireTrainer();
  const source = await first<VideoSource>("SELECT * FROM video_sources WHERE id = ? AND trainer_id = ?", id, trainer.id);
  if (!source) notFound();

  let found: FoundVideo[] = [];
  let fetchError = "";
  try {
    found = await listSourceVideos(source, { youtubeApiKey: process.env.YOUTUBE_API_KEY, vimeoToken: process.env.VIMEO_ACCESS_TOKEN });
  } catch (e) {
    fetchError = (e as Error).message;
  }
  const existing = new Set(
    (await all<{ provider_id: string }>("SELECT provider_id FROM videos WHERE trainer_id = ? AND provider = ?", trainer.id, source.platform)).map((r) => r.provider_id),
  );
  const fresh = found.filter((v) => !existing.has(v.id));
  const collections = await getCollections(trainer.id);
  const limited = source.platform === "youtube" ? !process.env.YOUTUBE_API_KEY : false;
  const platform = source.platform === "youtube" ? "YouTube" : "Vimeo";

  return (
    <>
      <Link href="/dashboard/videos/import" className="row muted small" style={{ textDecoration: "none", gap: 4 }}><Icon name="back" width={18} height={18} /> Import</Link>
      <div>
        <h1 style={{ marginBottom: 4 }}>{source.label}</h1>
        <a href={source.url} target="_blank" rel="noopener noreferrer" className="small muted">{platform} channel <Icon name="external" width={14} height={14} /></a>
      </div>
      <Notice error={error || fetchError || undefined} success={added !== undefined ? `Added ${added} video${added === "1" ? "" : "s"} to your library.` : saved ? "Saved." : undefined} />

      <form action={updateSource.bind(null, source.id)} className="card stack">
        <h2 style={{ margin: 0 }}>Auto-sync</h2>
        <label className="check"><input type="checkbox" name="auto_sync" defaultChecked={!!source.auto_sync} /> Check for new uploads every 30 minutes</label>
        <label className="check"><input type="checkbox" name="auto_publish" defaultChecked={!!source.auto_publish} /> Publish them right away and notify members</label>
        <div className="grid-2">
          <div><label htmlFor="default_category">Category for new videos</label><input id="default_category" name="default_category" defaultValue={source.default_category ?? ""} /></div>
          <div>
            <label htmlFor="default_collection_id">Add to collection</label>
            <select id="default_collection_id" name="default_collection_id" defaultValue={source.default_collection_id ?? ""}>
              <option value="">None</option>
              {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        {source.last_synced_at && <p className="tiny muted" style={{ margin: 0 }}>Last checked {relativeTime(source.last_synced_at)}{source.last_error ? ` · ${source.last_error}` : ""}</p>}
        <div className="row">
          <button className="btn btn-sm">Save</button>
          <button className="btn btn-danger btn-sm" formAction={removeSource.bind(null, source.id)}>Disconnect</button>
        </div>
      </form>

      <section className="stack-sm">
        <div className="row spread">
          <h2 style={{ margin: 0 }}>Not in your library ({fresh.length})</h2>
          <span className="tiny muted">{found.length} found</span>
        </div>
        {limited && <p className="hint">Showing the latest 15 uploads. Add a YouTube API key on the server to browse your full channel.</p>}
        {fresh.length === 0 ? (
          <p className="muted">{fetchError ? "Couldn't load videos right now." : "Everything from this channel is already in your library."}</p>
        ) : (
          <form action={importFromSource.bind(null, source.id)} className="stack-sm" id="import-form">
            <SelectAll formId="import-form" />
            <div className="list">
              {fresh.map((v) => (
                <label key={v.id} className="list-item" style={{ cursor: "pointer", margin: 0, fontWeight: 400 }}>
                  <input type="checkbox" name="video" value={v.id} defaultChecked />
                  <div className="video-thumb" style={{ width: 96, flex: "none" }}>{v.thumbnail_url && <img src={v.thumbnail_url} alt="" loading="lazy" />}</div>
                  <div className="grow">
                    <strong className="small" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{v.title}</strong>
                    {v.published_at && <div className="tiny muted">{new Date(v.published_at).toLocaleDateString("en-US", { dateStyle: "medium" })}</div>}
                  </div>
                </label>
              ))}
            </div>
            <div className="card stack-sm">
              <div><label htmlFor="i-category">Category</label><input id="i-category" name="category" defaultValue={source.default_category ?? ""} /></div>
              <div>
                <label htmlFor="i-collection">Collection</label>
                <select id="i-collection" name="collection" defaultValue={source.default_collection_id ?? ""}>
                  <option value="">None</option>
                  {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="save-bar"><button className="btn btn-block"><Icon name="plus" /> Add selected</button></div>
          </form>
        )}
      </section>
    </>
  );
}
