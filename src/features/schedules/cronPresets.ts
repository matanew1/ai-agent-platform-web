import type { useI18n } from "../../shared/i18n/I18nProvider";

type Translate = ReturnType<typeof useI18n>["t"];

export const CUSTOM_PRESET = "custom";

/** Common recurrences a schedule is likely to want, so most users never
 * have to write a cron expression by hand. "Custom" reveals a raw field
 * for anything not covered here. */
export const CRON_PRESETS: Array<{ id: string; cron: string; labelKey: Parameters<Translate>[0] }> = [
  { id: "hourly", cron: "0 * * * *", labelKey: "presetHourly" },
  { id: "daily-morning", cron: "0 8 * * *", labelKey: "presetDailyMorning" },
  { id: "daily-evening", cron: "0 18 * * *", labelKey: "presetDailyEvening" },
  { id: "weekdays-morning", cron: "0 9 * * 1-5", labelKey: "presetWeekdaysMorning" },
  { id: "weekly-monday", cron: "0 9 * * 1", labelKey: "presetWeeklyMonday" },
];

export function presetIdForCron(cron: string): string {
  return CRON_PRESETS.find((preset) => preset.cron === cron)?.id ?? CUSTOM_PRESET;
}

const WEEKDAY_KEYS = ["cronSun", "cronMon", "cronTue", "cronWed", "cronThu", "cronFri", "cronSat"] as const;

/** Best-effort plain-language description of a cron expression, covering
 * the shapes CRON_PRESETS produces plus simple hand-typed variants (a
 * single fixed minute/hour, and day-of-week single/range). Falls back to
 * the raw expression rather than guessing at anything more exotic - see
 * the "Custom" preset for that case. */
export function describeCron(expression: string, t: Translate): string {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return expression;
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  if (dayOfMonth !== "*" || month !== "*") return expression;

  if (minute === "0" && hour === "*" && dayOfWeek === "*") return t("cronEveryHour");
  if (!/^\d{1,2}$/.test(minute) || !/^\d{1,2}$/.test(hour)) return expression;

  const date = new Date();
  date.setHours(Number(hour), Number(minute), 0, 0);
  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  if (dayOfWeek === "*") return t("cronEveryDayAt", { time });
  if (/^\d$/.test(dayOfWeek)) {
    return t("cronEveryWeekdayAt", { weekday: t(WEEKDAY_KEYS[Number(dayOfWeek)]), time });
  }
  const range = dayOfWeek.match(/^(\d)-(\d)$/);
  if (range) {
    const start = t(WEEKDAY_KEYS[Number(range[1])]);
    const end = t(WEEKDAY_KEYS[Number(range[2])]);
    return t("cronEveryWeekdayRangeAt", { start, end, time });
  }
  return expression;
}
