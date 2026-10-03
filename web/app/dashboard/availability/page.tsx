import { Icon } from "@/components/ui/Icon";
import { DAY_ORDER, formatHours, formatTime, PRESETS, WEEKDAYS, weeklyMinutes } from "@/lib/availability";
import { all } from "@/lib/db";
import { requireTrainer } from "@/lib/trainer";
import type { AvailabilityRule } from "@/lib/types";
import { addAvailability, applyAvailabilityPreset, clearAvailabilityDay, deleteAvailability } from "../actions";
import { Notice } from "../Notice";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function AvailabilityPage({ searchParams }: Props) {
  const { error } = await searchParams;
  const trainer = await requireTrainer();
  const rules = await all<AvailabilityRule>("SELECT * FROM availability_rules WHERE trainer_id = ? ORDER BY weekday, start_time", trainer.id);
  const total = weeklyMinutes(rules);
  const openDays = new Set(rules.map((r) => r.weekday)).size;

  const presets = (
    <form action={applyAvailabilityPreset} className="scroll-x">
      {Object.entries(PRESETS).map(([key, p]) => (
        <button key={key} name="preset" value={key} className="chip">{p.label}</button>
      ))}
    </form>
  );

  return (
    <>
      <div>
        <h1 style={{ marginBottom: 4 }}>Weekly hours</h1>
        <p className="muted" style={{ margin: 0 }}>When clients can book you. Times are in {trainer.timezone.replace(/_/g, " ")}.</p>
      </div>
      <Notice error={error} />

      <div className="card hours-summary">
        <span className="icon-bubble accent"><Icon name="clock" /></span>
        <div className="grow">
          <div className="stat-label">Open each week</div>
          <p className="stat">{total ? formatHours(total) : "Not set"}</p>
        </div>
        {total > 0 && <span className="badge badge-accent">{openDays} {openDays === 1 ? "day" : "days"}</span>}
      </div>

      {rules.length === 0 ? (
        <section className="stack-sm">
          <div className="section-head"><h2>Quick start</h2></div>
          <p className="muted small" style={{ margin: 0 }}>Pick a starting point. You can fine-tune each day afterwards.</p>
          {presets}
        </section>
      ) : (
        <details className="card card-flat presets">
          <summary>Start over with a preset</summary>
          <p className="muted small">This replaces all your current hours.</p>
          {presets}
        </details>
      )}

      <div className="stack-sm">
        {DAY_ORDER.map((weekday) => {
          const day = rules.filter((r) => r.weekday === weekday);
          return (
            <section key={weekday} className={`card day-card${day.length ? "" : " off"}`} aria-labelledby={`day-${weekday}`}>
              <header>
                <div className="grow">
                  <h2 id={`day-${weekday}`}>{WEEKDAYS[weekday]}</h2>
                  <span className="small muted">{day.length ? `${day.length} ${day.length === 1 ? "window" : "windows"}` : "Unavailable"}</span>
                </div>
                {day.length > 0 && (
                  <form action={clearAvailabilityDay.bind(null, weekday)}>
                    <button className="btn btn-sm btn-soft" aria-label={`Clear ${WEEKDAYS[weekday]}`}>Clear</button>
                  </form>
                )}
              </header>

              {day.map((r) => (
                <form key={r.id} action={deleteAvailability.bind(null, r.id)} className="window">
                  <span className="grow"><strong>{formatTime(r.start_time)}</strong> <span className="muted">to</span> <strong>{formatTime(r.end_time)}</strong></span>
                  <button className="icon-btn" aria-label={`Remove ${formatTime(r.start_time)} to ${formatTime(r.end_time)} on ${WEEKDAYS[weekday]}`}><Icon name="x" /></button>
                </form>
              ))}

              <details className="add-hours">
                <summary className="btn btn-soft btn-sm"><Icon name="plus" /> {day.length ? "Add another window" : "Add hours"}</summary>
                <form action={addAvailability} className="stack-sm">
                  <input type="hidden" name="weekday" value={weekday} />
                  <div className="grid-2">
                    <div>
                      <label htmlFor={`from-${weekday}`}>From</label>
                      <input id={`from-${weekday}`} name="start_time" type="time" step={900} defaultValue={day.length ? day[day.length - 1].end_time : "09:00"} required />
                    </div>
                    <div>
                      <label htmlFor={`to-${weekday}`}>To</label>
                      <input id={`to-${weekday}`} name="end_time" type="time" step={900} defaultValue="17:00" required />
                    </div>
                  </div>
                  <button className="btn btn-block" type="submit">Save hours</button>
                </form>
              </details>
            </section>
          );
        })}
      </div>

      <p className="hint">Clients need at least 2 hours' notice and can book up to 30 days ahead.</p>
    </>
  );
}
