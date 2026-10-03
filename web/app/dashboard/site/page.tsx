import { siteUrl } from "@/lib/env";
import { hasActiveSubscription } from "@/lib/plans";
import { requireTrainer } from "@/lib/trainer";
import { saveSite } from "../actions";
import { Notice } from "../Notice";

type Props = { searchParams: Promise<{ error?: string; saved?: string }> };

export default async function SitePage({ searchParams }: Props) {
  const { error, saved } = await searchParams;
  const t = await requireTrainer();
  const timeZones = Intl.supportedValuesOf("timeZone");
  const live = t.site_published && hasActiveSubscription(t.subscription_status);

  return (
    <>
      <h1>Your site</h1>
      <Notice error={error} success={saved ? "Saved." : undefined} />
      {t.site_published && !live && <p className="notice">Your site goes live once your plan is active (Billing).</p>}
      <form action={saveSite} className="card">
        <div className="field">
          <label htmlFor="slug">Site link</label>
          <div className="row" style={{ flexWrap: "nowrap" }}>
            <span className="muted small">{siteUrl().replace(/^https?:\/\//, "")}/</span>
            <input id="slug" name="slug" required defaultValue={t.slug ?? ""} placeholder="jane-smith-fitness" />
          </div>
        </div>
        <div className="field"><label htmlFor="display_name">Business or trainer name</label><input id="display_name" name="display_name" required defaultValue={t.display_name ?? ""} /></div>
        <div className="field"><label htmlFor="headline">Headline</label><input id="headline" name="headline" defaultValue={t.headline ?? ""} placeholder="Strength coaching for busy professionals" /></div>
        <div className="field"><label htmlFor="bio">About you</label><textarea id="bio" name="bio" rows={6} defaultValue={t.bio ?? ""} /></div>
        <div className="field"><label htmlFor="location">Location</label><input id="location" name="location" defaultValue={t.location ?? ""} placeholder="Brooklyn, NY · In person & online" /></div>
        <div className="field"><label htmlFor="instagram_url">Instagram URL</label><input id="instagram_url" name="instagram_url" type="url" defaultValue={t.instagram_url ?? ""} /></div>
        <div className="field"><label htmlFor="logo_url">Logo image URL</label><input id="logo_url" name="logo_url" type="url" defaultValue={t.logo_url ?? ""} /></div>
        <div className="field"><label htmlFor="hero_image_url">Cover photo URL</label><input id="hero_image_url" name="hero_image_url" type="url" defaultValue={t.hero_image_url ?? ""} /></div>
        <div className="field">
          <label htmlFor="accent_color_hex">Brand color</label>
          <input id="accent_color_hex" name="accent_color_hex" type="color" defaultValue={t.accent_color_hex ?? "#1f6f5c"} style={{ width: 64, height: 40, padding: 4 }} />
        </div>
        <div className="field">
          <label htmlFor="timezone">Time zone</label>
          <select id="timezone" name="timezone" defaultValue={t.timezone}>
            {timeZones.map((tz) => <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>)}
          </select>
        </div>
        <div className="field row">
          <input id="site_published" name="site_published" type="checkbox" defaultChecked={t.site_published} />
          <label htmlFor="site_published" style={{ margin: 0 }}>Published</label>
        </div>
        <div className="field"><button className="btn" type="submit">Save</button></div>
      </form>
    </>
  );
}
