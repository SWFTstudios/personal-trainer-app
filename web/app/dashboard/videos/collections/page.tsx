import Link from "next/link";
import { VideoTabs } from "@/components/dashboard/VideoTabs";
import { Icon } from "@/components/ui/Icon";
import { requireTrainer } from "@/lib/trainer";
import { getCollections } from "@/lib/videos-admin";
import { createCollection, deleteCollection, renameCollection } from "../../app-actions";
import { Notice } from "../../Notice";

export default async function CollectionsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const trainer = await requireTrainer();
  const collections = await getCollections(trainer.id);
  return (
    <>
      <div>
        <h1 style={{ marginBottom: 4 }}>Collections</h1>
        <p className="muted" style={{ margin: 0 }}>Group videos into programs or series, like "4-week beginner plan" or "Desk mobility". A video can be in several collections.</p>
      </div>
      <VideoTabs active="/dashboard/videos/collections" />
      <Notice error={error} />
      <form action={createCollection} className="card stack-sm">
        <label htmlFor="name">New collection</label>
        <div className="row" style={{ flexWrap: "nowrap" }}>
          <input id="name" name="name" required placeholder="Beginner program" />
          <button className="btn"><Icon name="plus" /> Add</button>
        </div>
      </form>
      {collections.map((c) => (
        <details key={c.id} className="card">
          <summary className="row spread" style={{ cursor: "pointer", listStyle: "none" }}>
            <strong>{c.name}</strong>
            <span className="badge">{c.count} {c.count === 1 ? "video" : "videos"}</span>
          </summary>
          <form action={renameCollection.bind(null, c.id)} className="stack-sm" style={{ marginTop: 12 }}>
            <div><label htmlFor={`n-${c.id}`}>Name</label><input id={`n-${c.id}`} name="name" defaultValue={c.name} required /></div>
            <div><label htmlFor={`d-${c.id}`}>Description</label><textarea id={`d-${c.id}`} name="description" rows={2} defaultValue={c.description ?? ""} /></div>
            <div className="row">
              <button className="btn btn-sm">Save</button>
              <Link className="btn btn-ghost btn-sm" href={`/dashboard/videos?collection=${c.id}`}>View videos</Link>
              <button className="btn btn-danger btn-sm" formAction={deleteCollection.bind(null, c.id)}>Delete</button>
            </div>
          </form>
        </details>
      ))}
    </>
  );
}
