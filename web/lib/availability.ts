export type Window = { weekday: number; start_time: string; end_time: string };

/** Display order: Monday first, Sunday last (weekday numbers stay 0 = Sunday). */
export const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const days = (list: number[], start: string, end: string): Window[] => list.map((weekday) => ({ weekday, start_time: start, end_time: end }));
const MON_FRI = [1, 2, 3, 4, 5];

export const PRESETS = {
  weekdays: { label: "Weekdays 9–5", rules: days(MON_FRI, "09:00", "17:00") },
  mornings: { label: "Early mornings", rules: days(MON_FRI, "06:00", "11:00") },
  evenings: { label: "After work", rules: days(MON_FRI, "17:00", "21:00") },
  splitDay: { label: "Split days", rules: [...days(MON_FRI, "06:00", "10:00"), ...days(MON_FRI, "16:00", "20:00")] },
  weekends: { label: "Weekends", rules: days([6, 0], "08:00", "14:00") },
} satisfies Record<string, { label: string; rules: Window[] }>;

export type PresetKey = keyof typeof PRESETS;
export const isPresetKey = (key: string): key is PresetKey => Object.hasOwn(PRESETS, key);

export function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/** Total bookable time in a week, ignoring overlap between windows on the same day. */
export function weeklyMinutes(rules: Window[]): number {
  const byDay = new Map<number, [number, number][]>();
  for (const r of rules) byDay.set(r.weekday, [...(byDay.get(r.weekday) ?? []), [minutes(r.start_time), minutes(r.end_time)]]);
  let total = 0;
  for (const spans of byDay.values()) {
    spans.sort((a, b) => a[0] - b[0]);
    let end = -1;
    for (const [s, e] of spans) {
      total += Math.max(0, e - Math.max(s, end));
      end = Math.max(end, e);
    }
  }
  return total;
}

export function formatHours(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
