// Per-participant progress: daily goal, streak, week dots, points and the celebration numbers.
import type { Ctx, Row } from '../http.ts';
import { addDays, dayOfWeek, localDay, mondayOf, sqlShift } from '../time.ts';

export type DayStatus = 'done' | 'today' | 'open';

export function dayCounts(ctx: Ctx, userId: string): Map<string, number> {
  const rows = ctx.all(
    `SELECT date(created_at, ?) AS day, COUNT(*) AS n FROM scans WHERE user_id = ? GROUP BY day`,
    sqlShift(ctx.config.tzOffsetMin),
    userId,
  );
  return new Map(rows.map((r) => [r.day as string, r.n as number]));
}

/**
 * The streak counts consecutive days on which the daily goal was met. Today does not break it
 * while it is still in progress, and weekends never break it (the campus is mostly closed).
 */
export function goalState(ctx: Ctx, userId: string) {
  const goal = ctx.config.dailyGoal;
  const counts = dayCounts(ctx, userId);
  const today = localDay(ctx.now(), ctx.config.tzOffsetMin);
  const met = (day: string) => (counts.get(day) ?? 0) >= goal;

  let streak = met(today) ? 1 : 0;
  for (let day = addDays(today, -1), i = 0; i < 400; day = addDays(day, -1), i++) {
    if (met(day)) streak++;
    else if (dayOfWeek(day) === 0 || dayOfWeek(day) === 6) continue;
    else break;
  }

  const monday = mondayOf(today);
  const week = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(monday, i);
    const status: DayStatus = met(day) ? 'done' : day === today ? 'today' : 'open';
    return { day, status };
  });
  return { daily: goal, today: counts.get(today) ?? 0, streak, week };
}

export function pointsBalance(ctx: Ctx, userId: string): number {
  const earned = ctx.get('SELECT COALESCE(SUM(points), 0) AS n FROM scans WHERE user_id = ?', userId)!.n;
  const spent = ctx.get('SELECT COALESCE(SUM(cost_points), 0) AS n FROM redemptions WHERE user_id = ?', userId)!.n;
  return earned - spent;
}

/** The scan rows the student app lists (history) and celebrates. */
export function recentScans(ctx: Ctx, userId: string, limit = 20): Row[] {
  return ctx.all(
    `SELECT s.id, s.tier, s.verified, s.method, s.source, s.created_at, s.discount_vnd, s.points,
            v.name AS vendor_name, c.code AS cup_code
     FROM scans s JOIN cups c ON c.id = s.cup_id LEFT JOIN vendors v ON v.id = s.vendor_id
     WHERE s.user_id = ? ORDER BY s.created_at DESC LIMIT ?`,
    userId,
    limit,
  );
}
