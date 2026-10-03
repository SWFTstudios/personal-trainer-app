import { BrandFields } from "@/components/dashboard/BrandFields";
import { ImageField } from "@/components/dashboard/ImageField";
import { DEFAULT_ACCENT, normalizeHex } from "@/lib/brand";
import { getMediaLibrary } from "@/lib/dashboard";
import { siteUrl } from "@/lib/env";
import { hasActiveSubscription } from "@/lib/plans";
import { SOCIAL_LABELS } from "@/lib/social";
import { requireTrainer } from "@/lib/trainer";
import { SOCIAL_PLATFORMS } from "@/lib/types";
import { saveSite } from "../actions";
import { Notice } from "../Notice";

type Props = { searchParams: Promise<{ error?: string; saved?: string }> };

const PLACEHOLDER: Record<(typeof SOCIAL_PLATFORMS)[number], string> = {
  youtube: "https://youtube.com/@you",
  instagram: "https://instagram.com/you",
  tiktok: "https://tiktok.com/@you",
  twitch: "https://twitch.tv/you",
  facebook: "https://facebook.com/you",
  x: "https://x.com/you",
};

export default async function SitePage({ searchParams }: Props) {
  const { error, saved } = await searchParams;
  const t = await requireTrainer();
  const library = await getMediaLibrary(t.id);
  const timeZones = Intl.supportedValuesOf("timeZone");
  const live = t.site_published && hasActiveSubscription(t.subscription_status);
  const socials = { instagram: t.instagram_url ?? undefined, ...t.social_links };

  return (
    <>
      <h1 style={{ margin: 0 }}>Brand & theme</h1>
      <Notice error={error} success={saved ? "Saved." : undefined} />
      {t.site_published && !live && <p className="notice">Your site and app go live once your plan is active (Billing).</p>}
      <form action={saveSite} className="stack">
        <section className="card stack">
          <h2 style={{ margin: 0 }}>Identity</h2>
          <div>
            <label htmlFor="display_name">Business or trainer name</label>
            <input id="display_name" name="display_name" required defaultValue={t.display_name ?? ""} autoComplete="organization" />
          </div>
          <div>
            <label htmlFor="slug">Your link</label>
            <div className="row" style={{ flexWrap: "nowrap", gap: 6 }}>
              <span className="muted small" style={{ whiteSpace: "nowrap" }}>{siteUrl().replace(/^https?:\/\//, "")}/</span>
              <input id="slug" name="slug" required defaultValue={t.slug ?? ""} placeholder="jane-fit" autoCapitalize="none" autoCorrect="off" />
            </div>
            <p className="hint">Your site is at /{t.slug ?? "your-link"} and your members' app at /{t.slug ?? "your-link"}/app.</p>
          </div>
          <ImageField name="logo_url" label="Logo (also your app icon)" defaultValue={t.logo_url ?? ""} library={library} />
        </section>

        <section className="card stack">
          <h2 style={{ margin: 0 }}>Look & feel</h2>
          <BrandFields
            accent={normalizeHex(t.accent_color_hex) ?? DEFAULT_ACCENT}
            font={t.font_style}
            corners={t.corner_style}
            theme={t.theme_default}
            name={t.display_name ?? ""}
          />
        </section>

        <section className="card stack">
          <h2 style={{ margin: 0 }}>About</h2>
          <div><label htmlFor="headline">Headline</label><input id="headline" name="headline" defaultValue={t.headline ?? ""} placeholder="Strength coaching for busy people" /></div>
          <div><label htmlFor="bio">Bio</label><textarea id="bio" name="bio" rows={5} defaultValue={t.bio ?? ""} /></div>
          <div><label htmlFor="location">Location</label><input id="location" name="location" defaultValue={t.location ?? ""} placeholder="Brooklyn, NY · In person & online" /></div>
          <ImageField name="hero_image_url" label="Cover photo" defaultValue={t.hero_image_url ?? ""} library={library} />
        </section>

        <section className="card stack">
          <div>
            <h2 style={{ marginBottom: 4 }}>Social & live channels</h2>
            <p className="muted small" style={{ margin: 0 }}>Shown on your site and app, and pre-filled when you tap Go live.</p>
          </div>
          {SOCIAL_PLATFORMS.map((p) => (
            <div key={p}>
              <label htmlFor={`social_${p}`}>{SOCIAL_LABELS[p]}</label>
              <input id={`social_${p}`} name={`social_${p}`} type="url" inputMode="url" defaultValue={socials[p] ?? ""} placeholder={PLACEHOLDER[p]} />
            </div>
          ))}
        </section>

        <section className="card stack">
          <h2 style={{ margin: 0 }}>Publishing</h2>
          <div>
            <label htmlFor="timezone">Time zone</label>
            <select id="timezone" name="timezone" defaultValue={t.timezone}>
              {timeZones.map((tz) => <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>)}
            </select>
          </div>
          <label className="check"><input type="checkbox" name="site_published" defaultChecked={t.site_published} /> Site and app are published</label>
        </section>

        <div className="save-bar">
          <button className="btn btn-block" type="submit">Save changes</button>
        </div>
      </form>
    </>
  );
}
