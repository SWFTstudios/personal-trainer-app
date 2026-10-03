import { describe, expect, it } from "vitest";
import { accentFor, brandStyle, contrast, normalizeHex } from "./brand";
import { computeSlots, weekdayOf } from "./slots";

const NY = "America/New_York";
// Monday 2026-10-05, 9–11am New York = 13:00–15:00 UTC (EDT).
const monday = { weekday: 1, start_time: "09:00:00", end_time: "11:00:00" };
const longAgo = new Date("2026-01-01T00:00:00Z");

const iso = (dates: Date[]) => dates.map((d) => d.toISOString());

describe("computeSlots", () => {
  it("steps through the window in the trainer's timezone", () => {
    const slots = computeSlots({ date: "2026-10-05", timeZone: NY, rules: [monday], durationMinutes: 60, busy: [], now: longAgo });
    expect(iso(slots)).toEqual(["2026-10-05T13:00:00.000Z", "2026-10-05T13:30:00.000Z", "2026-10-05T14:00:00.000Z"]);
  });

  it("returns nothing on days without rules", () => {
    expect(computeSlots({ date: "2026-10-06", timeZone: NY, rules: [monday], durationMinutes: 60, busy: [], now: longAgo })).toEqual([]);
  });

  it("skips slots that overlap existing bookings, but allows back-to-back", () => {
    const busy = [{ start: new Date("2026-10-05T13:30:00Z"), end: new Date("2026-10-05T14:00:00Z") }];
    const slots = computeSlots({ date: "2026-10-05", timeZone: NY, rules: [monday], durationMinutes: 30, busy, now: longAgo });
    expect(iso(slots)).toEqual(["2026-10-05T13:00:00.000Z", "2026-10-05T14:00:00.000Z", "2026-10-05T14:30:00.000Z"]);
  });

  it("enforces minimum notice", () => {
    const now = new Date("2026-10-05T11:15:00Z"); // 7:15am NY; 2h notice → 9:15am earliest
    const slots = computeSlots({ date: "2026-10-05", timeZone: NY, rules: [monday], durationMinutes: 60, busy: [], now });
    expect(iso(slots)).toEqual(["2026-10-05T13:30:00.000Z", "2026-10-05T14:00:00.000Z"]);
  });

  it("handles DST: same local hours map to different UTC times", () => {
    // Monday 2026-11-02 is after the US fall-back, so 9am NY = 14:00 UTC (EST).
    const slots = computeSlots({ date: "2026-11-02", timeZone: NY, rules: [monday], durationMinutes: 120, busy: [], now: longAgo });
    expect(iso(slots)).toEqual(["2026-11-02T14:00:00.000Z"]);
  });

  it("dedupes overlapping rules and rejects malformed dates", () => {
    const rules = [monday, { ...monday, start_time: "10:00", end_time: "11:00" }];
    expect(computeSlots({ date: "2026-10-05", timeZone: NY, rules, durationMinutes: 60, busy: [], now: longAgo })).toHaveLength(3);
    expect(computeSlots({ date: "2026-10-5", timeZone: NY, rules, durationMinutes: 60, busy: [], now: longAgo })).toEqual([]);
  });

  it("computes weekday from the calendar date", () => {
    expect(weekdayOf("2026-10-04")).toBe(0);
    expect(weekdayOf("2026-10-05")).toBe(1);
  });
});

describe("brand", () => {
  it("normalizes hex", () => {
    expect(normalizeHex("1F6F5C")).toBe("#1f6f5c");
    expect(normalizeHex("red")).toBeNull();
    expect(brandStyle("javascript:alert(1)")).toEqual({});
  });

  it("keeps the accent at 3:1 contrast in both themes", () => {
    for (const hex of ["#ffffff", "#ffe600", "#000000", "#1f2a44", "#e11d48"]) {
      expect(contrast(accentFor(hex, "#f2f2ef"), "#f2f2ef")).toBeGreaterThanOrEqual(3);
      expect(contrast(accentFor(hex, "#0b0b0d"), "#0b0b0d")).toBeGreaterThanOrEqual(3);
    }
    expect(accentFor("#1f6f5c", "#f2f2ef")).toBe("#1f6f5c"); // already fine: untouched
  });

  it("picks readable button text and maps style options", () => {
    const s = brandStyle({ accent_color_hex: "#ffe600", font_style: "athletic", corner_style: "sharp" }) as Record<string, string>;
    expect(s["--brand-dark-text"]).toBe("#111111");
    expect(s["--font-display"]).toBe("var(--font-condensed)");
    expect(s["--radius-scale"]).toBe("0.12");
  });
});
