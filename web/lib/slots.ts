import { addMinutes } from "date-fns";
import { fromZonedTime } from "date-fns-tz";

export type Interval = { start: Date; end: Date };

export type SlotInput = {
  /** Calendar date in the trainer's timezone, YYYY-MM-DD. */
  date: string;
  timeZone: string;
  /** Weekly windows; start/end as HH:MM or HH:MM:SS in the trainer's timezone. */
  rules: { weekday: number; start_time: string; end_time: string }[];
  durationMinutes: number;
  busy: Interval[];
  now: Date;
  minNoticeMinutes?: number;
  stepMinutes?: number;
};

export const DEFAULT_MIN_NOTICE_MINUTES = 120;
export const DEFAULT_STEP_MINUTES = 30;
export const BOOKING_WINDOW_DAYS = 30;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDate(date: string): boolean {
  return DATE_RE.test(date) && !Number.isNaN(Date.parse(`${date}T00:00:00Z`));
}

/** Day of week (0 = Sunday) for a calendar date, independent of any timezone. */
export function weekdayOf(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

/** Bookable start times (UTC) for one day. */
export function computeSlots(input: SlotInput): Date[] {
  const {
    date,
    timeZone,
    rules,
    durationMinutes,
    busy,
    now,
    minNoticeMinutes = DEFAULT_MIN_NOTICE_MINUTES,
    stepMinutes = DEFAULT_STEP_MINUTES,
  } = input;
  if (!isValidDate(date)) return [];

  const earliest = addMinutes(now, minNoticeMinutes);
  const weekday = weekdayOf(date);
  const slots = new Map<number, Date>();

  for (const rule of rules) {
    if (rule.weekday !== weekday) continue;
    const windowStart = fromZonedTime(`${date}T${rule.start_time.slice(0, 5)}:00`, timeZone);
    const windowEnd = fromZonedTime(`${date}T${rule.end_time.slice(0, 5)}:00`, timeZone);

    for (let start = windowStart; addMinutes(start, durationMinutes) <= windowEnd; start = addMinutes(start, stepMinutes)) {
      const slot = { start, end: addMinutes(start, durationMinutes) };
      if (start < earliest) continue;
      if (busy.some((b) => overlaps(slot, b))) continue;
      slots.set(start.getTime(), start);
    }
  }

  return [...slots.values()].sort((a, b) => a.getTime() - b.getTime());
}
