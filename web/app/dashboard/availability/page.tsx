import { createClient } from "@/lib/supabase/server";
import { requireTrainer } from "@/lib/trainer";
import type { AvailabilityRule } from "@/lib/types";
import { addAvailability, deleteAvailability } from "../actions";
import { Notice } from "../Notice";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function toAmPm(time: string) {
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

type Props = { searchParams: Promise<{ error?: string }> };

export default async function AvailabilityPage({ searchParams }: Props) {
  const { error } = await searchParams;
  const trainer = await requireTrainer();
  const supabase = await createClient();
  const { data } = await supabase.from("availability_rules").select("*").eq("trainer_id", trainer.id).order("weekday").order("start_time");
  const rules = (data ?? []) as AvailabilityRule[];

  return (
    <>
      <h1>Weekly hours</h1>
      <p className="muted">
        Clients can book any open time inside these windows ({trainer.timezone.replace(/_/g, " ")}). Bookings need at
        least 2 hours' notice and can be made up to 30 days out.
      </p>
      <Notice error={error} />
      <div className="card">
        {rules.length === 0 && <p className="muted" style={{ margin: 0 }}>No hours yet.</p>}
        {WEEKDAYS.map((day, weekday) => {
          const dayRules = rules.filter((r) => r.weekday === weekday);
          if (dayRules.length === 0) return null;
          return (
            <div key={day} className="row" style={{ padding: "8px 0", alignItems: "flex-start" }}>
              <strong style={{ width: 110 }}>{day}</strong>
              <div className="row">
                {dayRules.map((r) => (
                  <form key={r.id} action={deleteAvailability.bind(null, r.id)} className="row" style={{ gap: 4 }}>
                    <span className="badge">{toAmPm(r.start_time)} – {toAmPm(r.end_time)}</span>
                    <button className="btn btn-ghost btn-sm" aria-label="Remove">×</button>
                  </form>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <form action={addAvailability} className="card row" style={{ alignItems: "flex-end" }}>
        <div style={{ flex: 2, minWidth: 140 }}>
          <label htmlFor="weekday">Day</label>
          <select id="weekday" name="weekday" defaultValue="1">
            {WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 110 }}><label htmlFor="start_time">From</label><input id="start_time" name="start_time" type="time" step={900} defaultValue="09:00" required /></div>
        <div style={{ flex: 1, minWidth: 110 }}><label htmlFor="end_time">To</label><input id="end_time" name="end_time" type="time" step={900} defaultValue="17:00" required /></div>
        <button className="btn" type="submit">Add hours</button>
      </form>
    </>
  );
}
