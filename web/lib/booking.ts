import "server-only";
import { addDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { createAdminClient } from "@/lib/supabase/admin";
import { BOOKING_WINDOW_DAYS, computeSlots, isValidDate } from "@/lib/slots";
import type { PublicTrainer, Service } from "@/lib/types";

export async function getActiveService(trainerId: string, serviceId: string): Promise<Service | null> {
  const { data } = await createAdminClient()
    .from("services")
    .select("*")
    .eq("id", serviceId)
    .eq("trainer_id", trainerId)
    .eq("active", true)
    .maybeSingle();
  return (data as Service | null) ?? null;
}

/** Bookable starts for one local date, accounting for existing live bookings. */
export async function availableSlots(trainer: PublicTrainer, service: Service, date: string, now = new Date()) {
  if (!isValidDate(date)) return [];
  const today = formatInTimeZone(now, trainer.timezone, "yyyy-MM-dd");
  const lastDay = formatInTimeZone(addDays(now, BOOKING_WINDOW_DAYS), trainer.timezone, "yyyy-MM-dd");
  if (date < today || date > lastDay) return [];

  const admin = createAdminClient();
  // Look a day either side so cross-midnight bookings and timezone offsets are covered.
  const from = addDays(new Date(`${date}T00:00:00Z`), -1).toISOString();
  const to = addDays(new Date(`${date}T00:00:00Z`), 2).toISOString();

  const [{ data: rules }, { data: bookings }] = await Promise.all([
    admin.from("availability_rules").select("weekday, start_time, end_time").eq("trainer_id", trainer.id),
    admin
      .from("bookings")
      .select("starts_at, ends_at, status, hold_expires_at")
      .eq("trainer_id", trainer.id)
      .neq("status", "cancelled")
      .lt("starts_at", to)
      .gt("ends_at", from),
  ]);

  const busy = (bookings ?? [])
    .filter((b) => b.status === "confirmed" || !b.hold_expires_at || new Date(b.hold_expires_at) > now)
    .map((b) => ({ start: new Date(b.starts_at), end: new Date(b.ends_at) }));

  return computeSlots({
    date,
    timeZone: trainer.timezone,
    rules: rules ?? [],
    durationMinutes: service.duration_minutes,
    busy,
    now,
  });
}
