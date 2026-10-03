import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

const TABS = [
  ["/dashboard/videos", "Library", "grid"],
  ["/dashboard/videos/upload", "Upload", "download"],
  ["/dashboard/videos/add", "Link", "link"],
  ["/dashboard/videos/import", "Import", "live"],
  ["/dashboard/videos/collections", "Collections", "file"],
] as const;

export function VideoTabs({ active }: { active: (typeof TABS)[number][0] }) {
  return (
    <div className="scroll-x" role="navigation" aria-label="Videos">
      {TABS.map(([href, label, icon]) => (
        <Link key={href} href={href} className="chip" aria-current={active === href ? "page" : undefined}>
          <Icon name={icon} width={16} height={16} /> {label}
        </Link>
      ))}
    </div>
  );
}
