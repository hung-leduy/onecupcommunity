import { HttpError, type Ctx } from '../http.ts';
import { addDays, daysBetween, isDay, localDay } from '../time.ts';

export type Settings = {
  pilotStart: string;
  pilotWeeks: number;
  studyEnd: string;
  rewardsEnd: string;
  /** Pilot week in which each stepped-wedge cluster starts the intervention. */
  clusterStarts: Record<string, number>;
  /** True when the database holds generated demo data (shown as a badge in the console). */
  demo: boolean;
};

export function readSettings(ctx: Ctx): Settings {
  const m: Record<string, string> = {};
  for (const r of ctx.all('SELECT key, value FROM settings')) m[r.key] = r.value;
  const p = ctx.config.pilot;
  return {
    pilotStart: m.pilot_start ?? p.start,
    pilotWeeks: Number(m.pilot_weeks ?? p.weeks),
    studyEnd: m.study_end ?? p.studyEnd,
    rewardsEnd: m.rewards_end ?? p.rewardsEnd,
    clusterStarts: m.cluster_starts ? JSON.parse(m.cluster_starts) : {},
    demo: m.demo === '1',
  };
}

export function writeSettings(ctx: Ctx, patch: Partial<Settings>) {
  const set = (key: string, value: string) =>
    ctx.run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, value);
  for (const [field, key] of [['pilotStart', 'pilot_start'], ['studyEnd', 'study_end'], ['rewardsEnd', 'rewards_end']] as const) {
    const v = patch[field];
    if (v === undefined) continue;
    if (!isDay(v)) throw new HttpError(400, 'bad_date', { field });
    set(key, v);
  }
  if (patch.pilotWeeks !== undefined) {
    if (!Number.isInteger(patch.pilotWeeks) || patch.pilotWeeks < 1 || patch.pilotWeeks > 52) throw new HttpError(400, 'bad_request', { field: 'pilotWeeks' });
    set('pilot_weeks', String(patch.pilotWeeks));
  }
  if (patch.clusterStarts !== undefined) {
    const clean: Record<string, number> = {};
    for (const [k, v] of Object.entries(patch.clusterStarts)) {
      if (!/^[A-Z]$/.test(k) || !Number.isInteger(v) || v < 1 || v > 52) throw new HttpError(400, 'bad_request', { field: 'clusterStarts' });
      clean[k] = v;
    }
    set('cluster_starts', JSON.stringify(clean));
  }
  if (patch.demo !== undefined) set('demo', patch.demo ? '1' : '0');
}

/** Study calendar derived from the settings and the current time. */
export function studyClock(ctx: Ctx, s = readSettings(ctx)) {
  const today = localDay(ctx.now(), ctx.config.tzOffsetMin);
  const sinceStart = daysBetween(s.pilotStart, today);
  return {
    today,
    /** 1-based pilot week of today; 0 before the pilot, > pilotWeeks after it. */
    week: sinceStart < 0 ? 0 : Math.floor(sinceStart / 7) + 1,
    weekStart: (w: number) => addDays(s.pilotStart, (w - 1) * 7),
    weekOfDay: (day: string) => Math.floor(daysBetween(s.pilotStart, day) / 7) + 1,
    studyEnded: today > s.studyEnd,
    rewardsOpen: today <= s.rewardsEnd,
    clusterStart: (cluster: string) => s.clusterStarts[cluster] ?? 1,
  };
}
