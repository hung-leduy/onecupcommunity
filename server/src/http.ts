import type { Request } from 'express';
import type { StatementSync } from 'node:sqlite';
import type { Config } from './config.ts';
import type { DB } from './db.ts';

export type Row = Record<string, any>;

/** API errors carry a stable `code` that the web app translates (vi / en). */
export class HttpError extends Error {
  status: number;
  code: string;
  details?: Record<string, unknown>;
  constructor(status: number, code: string, details?: Record<string, unknown>) {
    super(code);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export type Ctx = {
  db: DB;
  config: Config;
  /** Injectable clock so tests can move through days and weeks. */
  now(): Date;
  nowIso(): string;
  get(sql: string, ...params: any[]): Row | undefined;
  all(sql: string, ...params: any[]): Row[];
  run(sql: string, ...params: any[]): ReturnType<StatementSync['run']>;
  tx<T>(fn: () => T): T;
};

export function makeCtx(db: DB, config: Config, now: () => Date = () => new Date()): Ctx {
  const cache = new Map<string, StatementSync>();
  const stmt = (sql: string) => {
    let s = cache.get(sql);
    if (!s) cache.set(sql, (s = db.prepare(sql)));
    return s;
  };
  return {
    db,
    config,
    now,
    nowIso: () => now().toISOString(),
    get: (sql, ...params) => stmt(sql).get(...params) as Row | undefined,
    all: (sql, ...params) => stmt(sql).all(...params) as Row[],
    run: (sql, ...params) => stmt(sql).run(...params),
    tx(fn) {
      db.exec('BEGIN');
      try {
        const out = fn();
        db.exec('COMMIT');
        return out;
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    },
  };
}

export const bearer = (req: Request) => req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];

/** Small in-memory limiter for repeated failures (guessing station codes or cup codes). */
export function failureLimiter(max: number, windowMs: number) {
  const hits = new Map<string, { n: number; reset: number }>();
  return {
    check(key: string, now: number) {
      const h = hits.get(key);
      if (h && h.reset > now && h.n >= max) throw new HttpError(429, 'too_many_attempts');
    },
    fail(key: string, now: number) {
      const h = hits.get(key);
      if (!h || h.reset <= now) hits.set(key, { n: 1, reset: now + windowMs });
      else h.n++;
    },
  };
}
