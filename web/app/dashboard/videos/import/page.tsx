import Link from "next/link";
import { VideoTabs } from "@/components/dashboard/VideoTabs";
import { Icon } from "@/components/ui/Icon";
import { relativeTime } from "@/lib/app-data";
import { all } from "@/lib/db";
import { requireTrainer } from "@/lib/trainer";
import type { VideoSource } from "@/lib/types";
import { getCollections } from "@/lib/videos-admin";
import { addVideoLinks, connectSource } from "../../app-actions";
import { Notice } from "../../Notice";

type Props = { searchParams: Promise<{ error?: string; added?: string; dupes?: string; bad?: string }> };

export default async function ImportVideos({ searchParams }: Props) {
  const { error, added, dupes, bad } = await searchParams;
  const trainer = await requireTrainer();
  const [sources, collections] = await Promise.all([
    all<VideoSource>("SELECT * FROM video_sources WHERE trainer_id = ? ORDER BY created_at", trainer.id),
    getCollections(trainer.id),
  ]);
  const summary =
    added !== undefined
      ? `Added ${added} video${added === "1" ? "" : "s"}${Number(dupes) ? `, ${dupes} already in your library` : ""}${Number(bad) ? `, ${bad} link${bad === "1" ? "" : "s"} not recognised` : ""}.`
      : undefined;
  const youtube = trainer.social_links.youtube;

  return (
    <>
      <div>
        <h1 style={{ marginBottom: 4 }}>Import videos</h1>
        <p className="muted" style={{ margin: 0 }}>Bring in what you've already posted, so members can watch it in your app.</p>
      </div>
      <VideoTabs active="/dashboard/videos/import" />
      <Notice error={error} success={summary} />

      <section className="card stack">
        <div>
          <h2 style={{ marginBottom: 4 }}>Connect a channel</h2>
          <p className="muted small" style={{ margin: 0 }}>YouTube or Vimeo. Browse your videos, pick the ones to add, and optionally auto-add new uploads.</p>
        </div>
        <form action={connectSource} className="row" style={{ flexWrap: "nowrap", alignItems: "flex-end" }}>
          <div className="grow">
            <label htmlFor="channel" className="visually-hidden">Channel link</label>
            <input id="channel" name="channel" required defaultValue={youtube ?? ""} placeholder="youtube.com/@you or vimeo.com/you" autoCapitalize="none" autoCorrect="off" />
          </div>
          <button className="btn">Find videos</button>
        </form>
        {sources.length > 0 && (
          <div className="list">
            {sources.map((s) => (
              <Link key={s.id} href={`/dashboard/videos/import/${s.id}`} className="list-item">
                <Icon name={s.platform === "youtube" ? "play" : "video"} />
                <div className="grow">
                  <strong>{s.label}</strong>
                  <div className="tiny muted">
                    {s.platform === "youtube" ? "YouTube" : "Vimeo"}
                    {s.auto_sync ? " · auto-sync on" : ""}
                    {s.last_synced_at ? ` · checked ${relativeTime(s.last_synced_at)}` : ""}
                    {s.last_error ? ` · ${s.last_error}` : ""}
                  </div>
                </div>
                <Icon name="chevron" className="chev" />
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="card stack">
        <div>
          <h2 style={{ marginBottom: 4 }}>Paste share links</h2>
          <p className="muted small" style={{ margin: 0 }}>
            For TikTok and Instagram (and anything else): tap <strong>Share → Copy link</strong> on each video and paste them here, one per line. Up to 50 at a time.
          </p>
        </div>
        <form action={addVideoLinks} className="stack">
          <textarea name="urls" rows={6} required placeholder={"https://www.tiktok.com/@you/video/…\nhttps://www.instagram.com/reel/…\nhttps://youtu.be/…"} aria-label="Video links" />
          <div><label htmlFor="b-category">Category (optional)</label><input id="b-category" name="category" /></div>
          {collections.length > 0 && (
            <div className="row" style={{ gap: 8 }}>
              {collections.map((c) => (
                <label key={c.id} className="chip" style={{ margin: 0 }}><input type="checkbox" name="collections" value={c.id} style={{ width: 18, height: 18 }} /> {c.name}</label>
              ))}
            </div>
          )}
          <button className="btn btn-ghost"><Icon name="plus" /> Add all</button>
        </form>
      </section>
    </>
  );
}
