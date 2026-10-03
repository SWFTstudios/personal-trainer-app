import { formatDuration, formatMoney } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { requireTrainer } from "@/lib/trainer";
import type { Service } from "@/lib/types";
import { createService, deleteService, updateService } from "../actions";
import { Notice } from "../Notice";

type Props = { searchParams: Promise<{ error?: string }> };

function ServiceFields({ service }: { service?: Service }) {
  const key = service?.id ?? "new";
  return (
    <>
      <div className="field"><label htmlFor={`name-${key}`}>Name</label><input id={`name-${key}`} name="name" required defaultValue={service?.name} placeholder="1:1 Personal Training" /></div>
      <div className="field"><label htmlFor={`desc-${key}`}>Description</label><textarea id={`desc-${key}`} name="description" rows={2} defaultValue={service?.description ?? ""} /></div>
      <div className="row">
        <div style={{ flex: 1, minWidth: 140 }}>
          <label htmlFor={`dur-${key}`}>Length (minutes)</label>
          <input id={`dur-${key}`} name="duration_minutes" type="number" min={15} max={480} step={15} required defaultValue={service?.duration_minutes ?? 60} />
        </div>
        <div style={{ flex: 1, minWidth: 140 }}>
          <label htmlFor={`price-${key}`}>Price (USD, 0 = free)</label>
          <input id={`price-${key}`} name="price" type="number" min={0} step="0.01" required defaultValue={service ? service.price_cents / 100 : 0} />
        </div>
      </div>
      <div className="field row">
        <input id={`active-${key}`} name="active" type="checkbox" defaultChecked={service?.active ?? true} />
        <label htmlFor={`active-${key}`} style={{ margin: 0 }}>Bookable</label>
      </div>
    </>
  );
}

export default async function ServicesPage({ searchParams }: Props) {
  const { error } = await searchParams;
  const trainer = await requireTrainer();
  const supabase = await createClient();
  const { data } = await supabase.from("services").select("*").eq("trainer_id", trainer.id).order("sort_order").order("created_at");
  const services = (data ?? []) as Service[];

  return (
    <>
      <h1>Services</h1>
      <p className="muted">The session types clients can book. A free consult is a great first one.</p>
      <Notice error={error} />
      {services.map((s) => (
        <details key={s.id} className="card">
          <summary style={{ cursor: "pointer" }}>
            <strong>{s.name}</strong> <span className="muted small">· {formatDuration(s.duration_minutes)} · {formatMoney(s.price_cents, s.currency)}{!s.active && " · hidden"}</span>
          </summary>
          <form action={updateService.bind(null, s.id)} style={{ marginTop: 16 }}>
            <ServiceFields service={s} />
            <div className="field row">
              <button className="btn btn-sm" type="submit">Save</button>
              <button className="btn btn-danger btn-sm" formAction={deleteService.bind(null, s.id)}>Delete</button>
            </div>
          </form>
        </details>
      ))}
      <form action={createService} className="card">
        <h3>Add a service</h3>
        <ServiceFields />
        <div className="field"><button className="btn" type="submit">Add service</button></div>
      </form>
    </>
  );
}
