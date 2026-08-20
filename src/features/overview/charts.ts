import type { Session } from "../chat/types";

/** Counts of sessions whose last activity fell on each of the last `days` days,
 * oldest first. Built from whatever sessions are already loaded client-side
 * (see useChatSessions - sessions paginate, newest first, so this reflects
 * *recent* activity accurately even when older pages haven't been fetched). */
export function sessionActivityByDay(sessionsByAgent: Record<string, Session[]>, days = 14): number[] {
  const buckets = new Array(days).fill(0);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const msPerDay = 86_400_000;
  for (const sessions of Object.values(sessionsByAgent)) {
    for (const session of sessions) {
      const dayIndex = days - 1 - Math.floor((todayStart - startOfDay(session.updatedAt)) / msPerDay);
      if (dayIndex >= 0 && dayIndex < days) buckets[dayIndex] += 1;
    }
  }
  return buckets;
}

function startOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** Builds a smooth-ish SVG path (straight segments) plus a closed area path for
 * a sparkline/area chart, given equally-spaced values mapped into a viewBox. */
export function linePaths(values: number[], width: number, height: number, padding = 4) {
  const max = Math.max(1, ...values);
  const stepX = values.length > 1 ? (width - padding * 2) / (values.length - 1) : 0;
  const points = values.map((value, index) => {
    const x = padding + index * stepX;
    const y = padding + (height - padding * 2) * (1 - value / max);
    return [x, y] as const;
  });
  const line = points.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${points[points.length - 1]?.[0].toFixed(1) ?? padding},${height - padding} L${padding},${height - padding} Z`;
  return { line, area, points };
}

/** Tool-invocation frequency across every loaded session's assistant messages,
 * sorted descending. Bounded by what's loaded, same caveat as sessionActivityByDay. */
export function toolUsageCounts(sessionsByAgent: Record<string, Session[]>): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>();
  for (const sessions of Object.values(sessionsByAgent)) {
    for (const session of sessions) {
      for (const message of session.messages) {
        for (const tool of message.meta?.tools ?? []) {
          counts.set(tool, (counts.get(tool) ?? 0) + 1);
        }
      }
    }
  }
  return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}
