"use client";

import { useEffect, useMemo, useState } from "react";
import { addDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { formatDuration, formatMoney } from "@/lib/format";
import type { IntakeQuestion, Service } from "@/lib/types";

const DAYS_SHOWN = 21;

type Props = {
  slug: string;
  timeZone: string;
  services: Service[];
  questions: IntakeQuestion[];
  initialServiceId?: string;
};

export function BookingFlow({ slug, timeZone, services, questions, initialServiceId }: Props) {
  const [serviceId, setServiceId] = useState(
    services.find((s) => s.id === initialServiceId)?.id ?? (services.length === 1 ? services[0].id : ""),
  );
  const days = useMemo(() => {
    const now = new Date();
    return Array.from({ length: DAYS_SHOWN }, (_, i) => formatInTimeZone(addDays(now, i), timeZone, "yyyy-MM-dd"));
  }, [timeZone]);
  const [date, setDate] = useState(days[0]);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [slot, setSlot] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const service = services.find((s) => s.id === serviceId);

  useEffect(() => {
    if (!serviceId) return;
    let cancelled = false;
    setSlots(null);
    setSlot("");
    fetch(`/api/slots?${new URLSearchParams({ slug, serviceId, date })}`)
      .then((r) => (r.ok ? (r.json() as Promise<{ slots: string[] }>) : { slots: [] }))
      .then((d) => !cancelled && setSlots(d.slots))
      .catch(() => !cancelled && setSlots([]));
    return () => {
      cancelled = true;
    };
  }, [slug, serviceId, date]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          serviceId,
          startsAt: slot,
          name: form.get("name"),
          email: form.get("email"),
          phone: form.get("phone"),
          answers,
        }),
      });
      const body = (await res.json()) as { redirectUrl?: string; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Something went wrong.");
      window.location.assign(body.redirectUrl!);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  if (services.length === 0) return <p className="muted">No sessions are open for booking right now.</p>;

  return (
    <div className="stack">
      <section className="stack">
        <h3>1. Choose a session</h3>
        {services.map((s) => (
          <button
            key={s.id}
            type="button"
            className="card"
            style={{ width: "100%", textAlign: "left", cursor: "pointer", borderColor: s.id === serviceId ? "var(--accent)" : undefined, font: "inherit", color: "inherit" }}
            onClick={() => setServiceId(s.id)}
            aria-pressed={s.id === serviceId}
          >
            <strong>{s.name}</strong>
            <div className="muted small">{formatDuration(s.duration_minutes)} · {formatMoney(s.price_cents, s.currency)}</div>
          </button>
        ))}
      </section>

      {service && (
        <section className="stack">
          <h3>2. Pick a time</h3>
          <p className="muted small" style={{ margin: 0 }}>Times shown in {timeZone.replace(/_/g, " ")}</p>
          <div className="scroll-x">
            {days.map((d) => (
              <button key={d} type="button" className="chip" aria-pressed={d === date} onClick={() => setDate(d)}>
                {formatInTimeZone(new Date(`${d}T12:00:00Z`), "UTC", "EEE d MMM")}
              </button>
            ))}
          </div>
          {slots === null ? (
            <p className="muted">Loading times…</p>
          ) : slots.length === 0 ? (
            <p className="muted">No open times this day. Try another date.</p>
          ) : (
            <div className="row">
              {slots.map((s) => (
                <button key={s} type="button" className="chip" aria-pressed={s === slot} onClick={() => setSlot(s)}>
                  {formatInTimeZone(new Date(s), timeZone, "h:mm a")}
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {service && slot && (
        <form className="stack" onSubmit={submit}>
          <h3>3. Your details</h3>
          <div className="card">
            <div className="field"><label htmlFor="name">Full name</label><input id="name" name="name" required autoComplete="name" /></div>
            <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="email" /></div>
            <div className="field"><label htmlFor="phone">Phone (optional)</label><input id="phone" name="phone" type="tel" autoComplete="tel" /></div>
            {questions.map((q) => (
              <div className="field" key={q.id}>
                <label htmlFor={`q-${q.id}`}>{q.label}{q.required ? " *" : ""}</label>
                <IntakeInput question={q} value={answers[q.id] ?? ""} onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} />
              </div>
            ))}
          </div>
          {error && <p className="error">{error}</p>}
          <button className="btn" type="submit" disabled={submitting}>
            {submitting ? "Booking…" : service.price_cents > 0 ? `Continue to payment · ${formatMoney(service.price_cents, service.currency)}` : "Confirm booking"}
          </button>
          <p className="muted small">
            {formatInTimeZone(new Date(slot), timeZone, "EEEE, MMMM d 'at' h:mm a")} · {service.name}
          </p>
        </form>
      )}
    </div>
  );
}

function IntakeInput({ question, value, onChange }: { question: IntakeQuestion; value: string; onChange: (v: string) => void }) {
  const id = `q-${question.id}`;
  switch (question.kind) {
    case "long_text":
      return <textarea id={id} rows={4} required={question.required} value={value} onChange={(e) => onChange(e.target.value)} />;
    case "select":
    case "yes_no": {
      const options = question.kind === "yes_no" ? ["Yes", "No"] : question.options;
      return (
        <select id={id} required={question.required} value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select…</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }
    default:
      return <input id={id} required={question.required} value={value} onChange={(e) => onChange(e.target.value)} />;
  }
}
