import { describe, expect, it } from "vitest";
import { formatHours, formatTime, isPresetKey, PRESETS, weeklyMinutes } from "./availability";

describe("availability helpers", () => {
  it("formats times", () => {
    expect(formatTime("00:00")).toBe("12:00 AM");
    expect(formatTime("09:30")).toBe("9:30 AM");
    expect(formatTime("12:00")).toBe("12:00 PM");
    expect(formatTime("17:45")).toBe("5:45 PM");
  });

  it("totals weekly time and merges overlapping windows", () => {
    expect(weeklyMinutes(PRESETS.weekdays.rules)).toBe(5 * 8 * 60);
    expect(weeklyMinutes([
      { weekday: 1, start_time: "09:00", end_time: "12:00" },
      { weekday: 1, start_time: "11:00", end_time: "13:00" }, // overlaps by an hour
      { weekday: 2, start_time: "10:00", end_time: "10:30" },
    ])).toBe(4 * 60 + 30);
    expect(weeklyMinutes([])).toBe(0);
    expect(formatHours(270)).toBe("4h 30m");
    expect(formatHours(2400)).toBe("40h");
  });

  it("only accepts known presets and every preset is valid", () => {
    expect(isPresetKey("weekdays")).toBe(true);
    expect(isPresetKey("constructor")).toBe(false);
    expect(isPresetKey("toString")).toBe(false);
    for (const p of Object.values(PRESETS)) for (const r of p.rules) expect(r.end_time > r.start_time).toBe(true);
  });
});
