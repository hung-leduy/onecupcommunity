// Local-time helpers. The campus runs on UTC+7 all year; timestamps are stored as UTC ISO strings
// and turned into local days / hours here and, in SQL, with date(created_at, '+420 minutes').

export const DAY_MS = 86_400_000;

const ms = (d: Date | string | number) => (typeof d === 'number' ? d : typeof d === 'string' ? Date.parse(d) : d.getTime());

/** Local calendar day "YYYY-MM-DD" of an instant. */
export function localDay(d: Date | string | number, tzOffsetMin: number): string {
  return new Date(ms(d) + tzOffsetMin * 60_000).toISOString().slice(0, 10);
}

/** Local hour (0–23) of an instant. */
export function localHour(d: Date | string | number, tzOffsetMin: number): number {
  return new Date(ms(d) + tzOffsetMin * 60_000).getUTCHours();
}

export function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday. */
export function dayOfWeek(day: string): number {
  return new Date(`${day}T00:00:00Z`).getUTCDay();
}

export function mondayOf(day: string): string {
  const dow = dayOfWeek(day);
  return addDays(day, dow === 0 ? -6 : 1 - dow);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

/** UTC instant (ISO) at which a local day starts. */
export function dayStartIso(day: string, tzOffsetMin: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) - tzOffsetMin * 60_000).toISOString();
}

/** SQLite modifier that shifts a stored UTC timestamp to local time. */
export function sqlShift(tzOffsetMin: number): string {
  return `${tzOffsetMin >= 0 ? '+' : ''}${tzOffsetMin} minutes`;
}

export const isDay = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
