import { getUser } from "@/lib/auth/session";
import { all, first } from "@/lib/db";

const csvCell = (v: unknown) => {
  let s = v == null ? "" : String(v);
  // Neutralise spreadsheet formulas.
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

export async function GET() {
  const user = await getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const trainer = await first<{ id: string }>("SELECT id FROM trainers WHERE user_id = ?", user.id);
  if (!trainer) return new Response("Not found", { status: 404 });

  const rows = await all<Record<string, unknown>>(
    `SELECT client_name, client_email, client_phone, service_name, starts_at, amount_cents / 100.0 AS amount, status
     FROM bookings WHERE trainer_id = ? AND status = 'confirmed' ORDER BY starts_at DESC`,
    trainer.id,
  );
  const header = ["Name", "Email", "Phone", "Session", "Starts (UTC)", "Amount", "Status"];
  const lines = [header, ...rows.map((r) => Object.values(r))].map((r) => r.map(csvCell).join(","));
  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="clients.csv"' },
  });
}
