import { describe, expect, it } from "vitest";

import { CRON_PRESETS, CUSTOM_PRESET, describeCron, presetIdForCron } from "./cronPresets";

const t = ((key: string, values: Record<string, string> = {}) => {
  const copy: Record<string, string> = {
    cronEveryHour: "Runs every hour",
    cronEveryDayAt: "Runs every day at {time}",
    cronEveryWeekdayAt: "Runs every {weekday} at {time}",
    cronEveryWeekdayRangeAt: "Runs every {start}–{end} at {time}",
    cronSun: "Sunday", cronMon: "Monday", cronTue: "Tuesday", cronWed: "Wednesday",
    cronThu: "Thursday", cronFri: "Friday", cronSat: "Saturday",
  };
  return Object.entries(values).reduce((value, [name, replacement]) => value.replace(`{${name}}`, replacement), copy[key]);
}) as Parameters<typeof describeCron>[1];

describe("presetIdForCron", () => {
  it("matches a preset's exact cron expression", () => {
    expect(presetIdForCron("0 * * * *")).toBe("hourly");
    expect(presetIdForCron("0 8 * * *")).toBe("daily-morning");
  });

  it("falls back to custom for anything not in the preset list", () => {
    expect(presetIdForCron("*/15 * * * *")).toBe(CUSTOM_PRESET);
  });

  it("every preset round-trips through presetIdForCron", () => {
    for (const preset of CRON_PRESETS) {
      expect(presetIdForCron(preset.cron)).toBe(preset.id);
    }
  });
});

describe("describeCron", () => {
  it("describes an hourly expression", () => {
    expect(describeCron("0 * * * *", t)).toBe("Runs every hour");
  });

  it("describes a daily expression at a fixed time", () => {
    expect(describeCron("0 8 * * *", t)).toMatch(/^Runs every day at 8:00/);
  });

  it("describes a single weekday expression", () => {
    expect(describeCron("0 9 * * 1", t)).toMatch(/^Runs every Monday at 9:00/);
  });

  it("describes a weekday range expression", () => {
    expect(describeCron("0 9 * * 1-5", t)).toMatch(/^Runs every Monday–Friday at 9:00/);
  });

  it("falls back to the raw expression for anything it can't describe", () => {
    expect(describeCron("*/15 * * * *", t)).toBe("*/15 * * * *");
    expect(describeCron("0 8 15 * *", t)).toBe("0 8 15 * *");
    expect(describeCron("not a cron", t)).toBe("not a cron");
  });
});
