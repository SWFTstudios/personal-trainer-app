import type { Collection } from "@/lib/types";

/** Category, collections and visibility fields shared by add / upload / edit forms. */
export function VideoMetaFields({
  categories,
  collections,
  category = "",
  selected = [],
  visibility = "members",
}: {
  categories: string[];
  collections: Collection[];
  category?: string;
  selected?: string[];
  visibility?: "members" | "public";
}) {
  return (
    <>
      <div>
        <label htmlFor="category">Category</label>
        <input id="category" name="category" list="video-categories" defaultValue={category} placeholder="Mobility, Strength, Nutrition…" />
        <datalist id="video-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
        <p className="hint">Members can filter videos by category.</p>
      </div>
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: 6 }}>Collections</legend>
        {collections.length === 0 ? (
          <p className="hint" style={{ margin: 0 }}>No collections yet. <a href="/dashboard/videos/collections">Create one</a> to group videos into programs or series.</p>
        ) : (
          <div className="row" style={{ gap: 8 }}>
            {collections.map((c) => (
              <label key={c.id} className="chip" style={{ margin: 0, cursor: "pointer" }}>
                <input type="checkbox" name="collections" value={c.id} defaultChecked={selected.includes(c.id)} style={{ width: 18, height: 18 }} /> {c.name}
              </label>
            ))}
          </div>
        )}
      </fieldset>
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: 6 }}>Who can watch</legend>
        <label className="check"><input type="radio" name="visibility" value="members" defaultChecked={visibility === "members"} /> Members only (in your app)</label>
        <label className="check"><input type="radio" name="visibility" value="public" defaultChecked={visibility === "public"} /> Everyone (app + website video blocks)</label>
      </fieldset>
    </>
  );
}
