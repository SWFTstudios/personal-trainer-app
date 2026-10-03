import Link from "next/link";
import { PushToggle } from "@/components/app/PushToggle";
import { Icon } from "@/components/ui/Icon";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { getUser } from "@/lib/auth/session";
import { requireMember } from "@/lib/member";
import { vapidKeys } from "@/lib/notify";
import { signOutMember, updateProfile } from "../../actions";

export default async function ProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { trainer, member } = await requireMember(slug);
  const user = await getUser();

  return (
    <div className="container stack page-pad">
      <h1 style={{ margin: 0 }}>Profile</h1>
      <form action={updateProfile.bind(null, trainer.slug)} className="card stack-sm">
        <label htmlFor="name">Name</label>
        <div className="row" style={{ flexWrap: "nowrap" }}>
          <input id="name" name="name" defaultValue={member.display_name} autoComplete="name" />
          <button className="btn btn-ghost">Save</button>
        </div>
        <p className="muted small" style={{ margin: 0 }}>{user?.email}</p>
      </form>

      <div className="card stack">
        <PushToggle slug={trainer.slug} vapidKey={vapidKeys()?.publicKey ?? null} coach={trainer.display_name ?? "your coach"} />
        <div className="stack-sm">
          <strong>Appearance</strong>
          <ThemeToggle />
        </div>
      </div>

      <div className="card stack-sm">
        <strong>Install the app</strong>
        <p className="muted small" style={{ margin: 0 }}>
          iPhone: tap <strong>Share</strong> → <strong>Add to Home Screen</strong>. Android: tap <strong>⋮</strong> → <strong>Install app</strong>.
        </p>
      </div>

      <div className="list">
        <Link href={`/${trainer.slug}`} className="list-item"><Icon name="home" /><span className="grow">{trainer.display_name}'s website</span><Icon name="chevron" className="chev" /></Link>
        <Link href={`/${trainer.slug}/book`} className="list-item"><Icon name="calendar" /><span className="grow">Book a session</span><Icon name="chevron" className="chev" /></Link>
      </div>

      <form action={signOutMember.bind(null, trainer.slug)}>
        <button className="btn btn-ghost btn-block"><Icon name="logout" /> Sign out</button>
      </form>
    </div>
  );
}
