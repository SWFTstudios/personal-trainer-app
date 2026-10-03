import "server-only";
import { addDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { all, first } from "@/lib/db";
import { toService } from "@/lib/rows";
import { BOOKING_WINDOW_DAYS, computeSlots, isLive, isValidDate } from "@/lib/slots";
import type { PublicTrainer, Service } from "@/lib/types";

export async function getActiveServices(trainerId: string): Promise<Service[]> {
  const rows = await all<Parameters<typeof toService>[0]>(
    "SELECT * FROM services WHERE trainer_id = ? AND active = 1 ORDER BY sort_order, created_at",
    trainerId,
  );
  return rows.map(toService);
}

export async function getActiveService(trainerId: string, serviceId: string): Promise<Service | null> {
  const row = await first<Parameters<typeof toService>[0]>(
    "SELECT * FROM services WHERE id = ? AND trainer_id = ? AND active = 1",
    serviceId,
    trainerId,
  );
  return row ? toService(row) : null;
}

/** Bookable starts for one local date, accounting for existing live bookings. */
export async function availableSlots(trainer: PublicTrainer, service: Service, date: string, now = new Date()) {
  if (!isValidDate(date)) return [];
  const today = formatInTimeZone(now, trainer.timezone, "yyyy-MM-dd");
  const lastDay = formatInTimeZone(addDays(now, BOOKING_WINDOW_DAYS), trainer.timezone, "yyyy-MM-dd");
  if (date < today || date > lastDay) return [];

  // Look a day either side so cross-midnight bookings and timezone offsets are covered.
  const from = addDays(new Date(`${date}T00:00:00Z`), -1).toISOString();
  const to = addDays(new Date(`${date}T00:00:00Z`), 2).toISOString();

  const [rules, bookings] = await Promise.all([
    all<{ weekday: number; start_time: string; end_time: string }>(
      "SELECT weekday, start_time, end_time FROM availability_rules WHERE trainer_id = ?",
      trainer.id,
    ),
    all<{ starts_at: string; ends_at: string; status: string; hold_expires_at: string | null }>(
      `SELECT starts_at, ends_at, status, hold_expires_at FROM bookings
       WHERE trainer_id = ? AND status <> 'cancelled' AND starts_at < ? AND ends_at > ?`,
      trainer.id,
      to,
      from,
    ),
  ]);

  const busy = bookings
    .filter((b) => isLive(b, now))
    .map((b) => ({ start: new Date(b.starts_at), end: new Date(b.ends_at) }));

  return computeSlots({ date, timeZone: trainer.timezone, rules, durationMinutes: service.duration_minutes, busy, now });
}
