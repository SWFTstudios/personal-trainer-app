import { formatInTimeZone } from "date-fns-tz";

export function formatMoney(cents: number, currency = "usd"): string {
  if (cents === 0) return "Free";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

export function formatSlot(iso: string, timeZone: string): string {
  return formatInTimeZone(new Date(iso), timeZone, "EEE, MMM d · h:mm a zzz");
}
