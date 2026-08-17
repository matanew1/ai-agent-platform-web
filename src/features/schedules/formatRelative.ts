/** Formats an ISO timestamp as a short relative string ("in 2 hours",
 * "3 days ago") for schedule next/last-run display. Shared between
 * SchedulesDashboard's cards and ScheduleHistoryPage's header. */
export function formatRelative(iso: string, locale?: string): string {
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return iso;
  const diffMinutes = Math.round((target - Date.now()) / 60000);
  const absMinutes = Math.abs(diffMinutes);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (absMinutes < 60) return formatter.format(diffMinutes, "minute");
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return formatter.format(diffHours, "hour");
  return formatter.format(Math.round(diffHours / 24), "day");
}
