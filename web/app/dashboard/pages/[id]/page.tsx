import Link from "next/link";
import { notFound } from "next/navigation";
import { PageEditor } from "@/components/dashboard/PageEditor";
import { first } from "@/lib/db";
import { getMediaLibrary, liveSiteBase } from "@/lib/dashboard";
import { toPage } from "@/lib/rows";
import { requireTrainer } from "@/lib/trainer";
import { deletePage } from "../../cms-actions";

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trainer = await requireTrainer();
  const row = await first<Parameters<typeof toPage>[0]>("SELECT * FROM pages WHERE id = ? AND trainer_id = ?", id, trainer.id);
  if (!row) notFound();
  const page = toPage(row);
  const library = await getMediaLibrary(trainer.id);

  return (
    <>
      <Link href="/dashboard/pages" className="muted small">← Pages</Link>
      <PageEditor page={page} siteBase={liveSiteBase(trainer)} library={library} />
      <form action={deletePage.bind(null, page.id)}>
        <button className="btn btn-danger btn-sm">{page.path === "" ? "Reset home page to default" : "Delete page"}</button>
      </form>
    </>
  );
}
