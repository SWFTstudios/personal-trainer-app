import { VideoMetaFields } from "@/components/dashboard/VideoMetaFields";
import { VideoTabs } from "@/components/dashboard/VideoTabs";
import { Icon } from "@/components/ui/Icon";
import { getVideoCategories } from "@/lib/app-data";
import { requireTrainer } from "@/lib/trainer";
import { getCollections } from "@/lib/videos-admin";
import { addVideo } from "../../app-actions";
import { Notice } from "../../Notice";

export default async function AddVideoLink({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const trainer = await requireTrainer();
  const [collections, categories] = await Promise.all([getCollections(trainer.id), getVideoCategories(trainer.id)]);
  return (
    <>
      <h1 style={{ margin: 0 }}>Add a video link</h1>
      <VideoTabs active="/dashboard/videos/add" />
      <Notice error={error} />
      <form action={addVideo} className="card stack">
        <div>
          <label htmlFor="url">Share link</label>
          <input id="url" name="url" type="url" inputMode="url" required placeholder="https://youtu.be/… or https://www.tiktok.com/@you/video/…" />
          <p className="hint">YouTube, Vimeo, TikTok, Instagram Reels, Loom or a direct .mp4 link. Title and thumbnail fill in automatically.</p>
        </div>
        <div><label htmlFor="title">Name (optional)</label><input id="title" name="title" /></div>
        <VideoMetaFields categories={categories} collections={collections} />
        <label className="check"><input type="checkbox" name="notify" defaultChecked /> Notify members</label>
        <button className="btn"><Icon name="plus" /> Add video</button>
      </form>
    </>
  );
}
