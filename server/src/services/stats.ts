// Analytics for the research console. Only verified scans (tiers 1–2) enter H1/H3 figures.
import { createHmac } from 'node:crypto';
import { ARMS, ARM_LETTER, impactOf } from '../domain.ts';
import type { Ctx, Row } from '../http.ts';
import { DAY_MS, addDays, localDay, sqlShift } from '../time.ts';
import { readSettings, studyClock, type Settings } from './settings.ts';

export const pseudonym = (ctx: Ctx, id: string | null | undefined, salt = 'participant') =>
  id ? createHmac('sha256', `${salt}:${ctx.config.stationSecret}`).update(id).digest('hex').slice(0, 12) : '';

type Share = { vendorId: string; cluster: string; day: string; week: number; drinks: number; reusable: number; intervention: boolean };

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const ratio = (rows: Share[]) => {
  const drinks = sum(rows.map((r) => r.drinks));
  return drinks ? sum(rows.map((r) => r.reusable)) / drinks : null;
};
const round = (x: number | null, digits = 3) => (x === null ? null : Math.round(x * 10 ** digits) / 10 ** digits);

/**
 * Reuse share per outlet-day: reusable cups / all drinks served. Before an outlet's cluster starts
 * the intervention, reusable cups come from observation counts; afterwards from verified scans.
 */
function vendorDayShares(ctx: Ctx, s: Settings): Share[] {
  const clock = studyClock(ctx, s);
  const clusterOf = new Map(ctx.all('SELECT id, cluster FROM vendors').map((v) => [v.id as string, v.cluster as string]));
  const scans = new Map(
    ctx
      .all(
        `SELECT vendor_id, date(created_at, ?) AS day, COUNT(*) AS n FROM scans
         WHERE verified = 1 AND vendor_id IS NOT NULL GROUP BY vendor_id, day`,
        sqlShift(ctx.config.tzOffsetMin),
      )
      .map((r) => [`${r.vendor_id}|${r.day}`, r.n as number]),
  );
  const out: Share[] = [];
  for (const d of ctx.all('SELECT vendor_id, day, drinks_total, reusable_observed FROM vendor_days WHERE drinks_total > 0')) {
    const cluster = clusterOf.get(d.vendor_id);
    if (!cluster) continue;
    const week = clock.weekOfDay(d.day);
    const intervention = week >= clock.clusterStart(cluster);
    const reusable = intervention ? (scans.get(`${d.vendor_id}|${d.day}`) ?? 0) : d.reusable_observed;
    if (reusable === null || reusable === undefined) continue;
    out.push({ vendorId: d.vendor_id, cluster, day: d.day, week, drinks: d.drinks_total, reusable: Math.min(reusable, d.drinks_total), intervention });
  }
  return out;
}

type UserScans = { users: Row[]; verifiedByUser: Map<string, number[]> };

function loadUserScans(ctx: Ctx): UserScans {
  const users = ctx.all('SELECT id, arm, faculty, intake, created_at, consent_research, consent_open_data FROM users');
  const verifiedByUser = new Map<string, number[]>();
  for (const r of ctx.all('SELECT user_id, created_at FROM scans WHERE verified = 1 AND user_id IS NOT NULL')) {
    const list = verifiedByUser.get(r.user_id) ?? [];
    list.push(Date.parse(r.created_at));
    verifiedByUser.set(r.user_id, list);
  }
  return { users, verifiedByUser };
}

/** Share of participants registered ≥ `week` weeks ago who still had a verified scan in their `week`-th week. */
function retention(ctx: Ctx, users: Row[], data: UserScans, week = 8): number | null {
  const now = ctx.now().getTime();
  const eligible = users.filter((u) => Date.parse(u.created_at) <= now - week * 7 * DAY_MS);
  if (!eligible.length) return null;
  const active = eligible.filter((u) => {
    const from = Date.parse(u.created_at) + (week - 1) * 7 * DAY_MS;
    const to = from + 7 * DAY_MS;
    return (data.verifiedByUser.get(u.id) ?? []).some((t) => t >= from && t < to);
  });
  return active.length / eligible.length;
}

/** Mean verified scans per participant per enrolled week. */
function scansPerWeek(ctx: Ctx, users: Row[], data: UserScans): number | null {
  if (!users.length) return null;
  const now = ctx.now().getTime();
  const rates = users.map((u) => {
    const weeks = Math.max(1, (now - Date.parse(u.created_at)) / (7 * DAY_MS));
    return (data.verifiedByUser.get(u.id)?.length ?? 0) / weeks;
  });
  return sum(rates) / rates.length;
}

function armTable(ctx: Ctx, data: UserScans) {
  return ARMS.map((arm) => {
    const users = data.users.filter((u) => u.arm === arm);
    return {
      arm,
      letter: ARM_LETTER[arm],
      n: users.length,
      scansPerWeek: round(scansPerWeek(ctx, users, data), 2),
      retentionW8: round(retention(ctx, users, data)),
    };
  });
}

function weekWindow(clockWeek: number, s: Settings, weeks?: number) {
  const last = Math.min(Math.max(clockWeek, 0), s.pilotWeeks);
  const first = weeks ? Math.max(1, last - weeks + 1) : 1;
  return { first, last };
}

export function overview(ctx: Ctx, weeks?: number) {
  const s = readSettings(ctx);
  const clock = studyClock(ctx, s);
  const now = ctx.now().getTime();
  const iso = (t: number) => new Date(t).toISOString();
  const data = loadUserScans(ctx);
  const shares = vendorDayShares(ctx, s);
  const { first, last } = weekWindow(clock.week, s, weeks);

  const latestWeek = Math.max(0, ...shares.filter((r) => r.week <= last).map((r) => r.week));
  const shareNow = ratio(shares.filter((r) => r.week === latestWeek));
  const shareBaseline = ratio(shares.filter((r) => !r.intervention));
  const active = (from: number, to: number) =>
    ctx.get('SELECT COUNT(DISTINCT user_id) AS n FROM scans WHERE user_id IS NOT NULL AND created_at >= ? AND created_at < ?', iso(from), iso(to))!.n as number;
  const activeNow = active(now - 7 * DAY_MS, now + 1);
  const activePrev = active(now - 14 * DAY_MS, now - 7 * DAY_MS);

  const vendors = ctx.all('SELECT id, name, cluster FROM vendors ORDER BY cluster, name');
  const clusters = [...new Set(vendors.map((v) => v.cluster as string))].sort().map((cluster) => {
    const series = [];
    for (let w = first; w <= last; w++) series.push({ week: w, share: round(ratio(shares.filter((r) => r.cluster === cluster && r.week === w))) });
    const current = [...series].reverse().find((p) => p.share !== null)?.share ?? null;
    return { cluster, vendors: vendors.filter((v) => v.cluster === cluster).map((v) => v.name), startWeek: clock.clusterStart(cluster), series, current };
  });

  const weekAgoDay = localDay(now - 7 * DAY_MS, ctx.config.tzOffsetMin);
  const tierCounts = new Map(ctx.all('SELECT vendor_id, tier, COUNT(*) AS n FROM scans WHERE verified = 1 GROUP BY vendor_id, tier').map((r) => [`${r.vendor_id}|${r.tier}`, r.n as number]));
  const vendorRows = vendors.map((v) => {
    const t1 = tierCounts.get(`${v.id}|1`) ?? 0;
    const t2 = tierCounts.get(`${v.id}|2`) ?? 0;
    return {
      id: v.id,
      name: v.name,
      cluster: v.cluster,
      share: round(ratio(shares.filter((r) => r.vendorId === v.id && r.day > weekAgoDay))),
      scans: t1 + t2,
      staffShare: t1 + t2 ? round(t1 / (t1 + t2)) : null,
    };
  });

  return {
    settings: s,
    week: clock.week,
    today: clock.today,
    vendorsCount: vendors.length,
    kpis: {
      participants: data.users.length,
      newThisWeek: data.users.filter((u) => Date.parse(u.created_at) >= now - 7 * DAY_MS).length,
      activeThisWeek: activeNow,
      activeChange: activePrev ? round((activeNow - activePrev) / activePrev) : null,
      verifiedScans: ctx.get('SELECT COUNT(*) AS n FROM scans WHERE verified = 1')!.n,
      reuseShare: round(shareNow),
      reuseShareBaseline: round(shareBaseline),
      retentionW8: round(retention(ctx, data.users, data)),
    },
    clusters,
    arms: armTable(ctx, data),
    vendors: vendorRows,
    quality: quality(ctx, false),
  };
}

export function quality(ctx: Ctx, detailed = true) {
  const now = ctx.now().getTime();
  const weekAgo = new Date(now - 7 * DAY_MS).toISOString();
  const tiers = Object.fromEntries(ctx.all('SELECT tier, COUNT(*) AS n FROM scans GROUP BY tier').map((r) => [`l${r.tier}`, r.n as number]));
  const base = {
    l1: tiers.l1 ?? 0,
    l2: tiers.l2 ?? 0,
    l3: tiers.l3 ?? 0,
    flagsThisWeek: ctx.get('SELECT COUNT(*) AS n FROM scan_flags WHERE created_at >= ?', weekAgo)!.n as number,
    unlinkedScans: ctx.get('SELECT COUNT(*) AS n FROM scans WHERE verified = 1 AND user_id IS NULL')!.n as number,
  };
  if (!detailed) return base;
  return {
    ...base,
    flags: ctx
      .all(
        `SELECT f.created_at, f.reason, f.tier, f.cup_id, f.user_id, v.name AS vendor_name
         FROM scan_flags f LEFT JOIN vendors v ON v.id = f.vendor_id ORDER BY f.created_at DESC LIMIT 100`,
      )
      .map((f) => ({ createdAt: f.created_at, reason: f.reason, tier: f.tier, vendor: f.vendor_name, cup: pseudonym(ctx, f.cup_id, 'cup'), participant: pseudonym(ctx, f.user_id) })),
    unlinkedByVendor: ctx.all(
      `SELECT v.name AS vendor, COUNT(*) AS n FROM scans s JOIN vendors v ON v.id = s.vendor_id
       WHERE s.verified = 1 AND s.user_id IS NULL GROUP BY v.id ORDER BY n DESC`,
    ),
    // Participants who mostly self-scan deserve a look before their data is analysed.
    selfScanners: ctx
      .all(
        `SELECT user_id, SUM(tier = 3) AS l3, COUNT(*) AS total FROM scans WHERE user_id IS NOT NULL
         GROUP BY user_id HAVING total >= 5 AND l3 * 2 >= total ORDER BY l3 * 1.0 / total DESC, total DESC LIMIT 20`,
      )
      .map((r) => ({ participant: pseudonym(ctx, r.user_id), l3: r.l3, total: r.total, share: round(r.l3 / r.total) })),
  };
}

export function participants(ctx: Ctx) {
  const s = readSettings(ctx);
  const clock = studyClock(ctx, s);
  const data = loadUserScans(ctx);
  const faculties = [...new Set(data.users.map((u) => (u.faculty as string | null) ?? ''))].sort();
  const byFaculty = faculties.map((faculty) => {
    const row: Record<string, any> = { faculty: faculty || null, total: 0 };
    for (const arm of ARMS) row[arm] = data.users.filter((u) => (u.faculty ?? '') === faculty && u.arm === arm).length;
    row.total = ARMS.reduce((a, arm) => a + row[arm], 0);
    return row;
  });
  const regByWeek = new Map<number, number>();
  for (const u of data.users) {
    const w = clock.weekOfDay(localDay(u.created_at, ctx.config.tzOffsetMin));
    regByWeek.set(w, (regByWeek.get(w) ?? 0) + 1);
  }
  const stats = new Map(
    ctx
      .all(
        `SELECT user_id, SUM(verified) AS verified, SUM(1 - verified) AS unverified, MAX(created_at) AS last
         FROM scans WHERE user_id IS NOT NULL GROUP BY user_id`,
      )
      .map((r) => [r.user_id as string, r]),
  );
  const cups = new Map(ctx.all('SELECT user_id, COUNT(*) AS n FROM cups WHERE user_id IS NOT NULL GROUP BY user_id').map((r) => [r.user_id as string, r.n as number]));
  return {
    total: data.users.length,
    byFaculty,
    registrations: [...regByWeek.entries()].sort((a, b) => a[0] - b[0]).map(([week, n]) => ({ week, n })),
    list: data.users
      .map((u) => {
        const st = stats.get(u.id);
        return {
          participant: pseudonym(ctx, u.id),
          faculty: u.faculty,
          intake: u.intake,
          arm: ARM_LETTER[u.arm as keyof typeof ARM_LETTER] ?? u.arm,
          consentResearch: !!u.consent_research,
          consentOpenData: !!u.consent_open_data,
          cups: cups.get(u.id) ?? 0,
          verified: st?.verified ?? 0,
          unverified: st?.unverified ?? 0,
          lastActive: st?.last ?? null,
          createdAt: u.created_at,
        };
      })
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))),
  };
}

export function arms(ctx: Ctx) {
  const s = readSettings(ctx);
  const clock = studyClock(ctx, s);
  const data = loadUserScans(ctx);
  // Only complete weeks: the running week would read as a drop in activity.
  const { last } = weekWindow(clock.week, s);
  const lastComplete = clock.week <= s.pilotWeeks ? last - 1 : last;
  const weekly = [];
  for (let w = 1; w <= lastComplete; w++) {
    const start = Date.parse(`${clock.weekStart(w)}T00:00:00Z`) - ctx.config.tzOffsetMin * 60_000;
    const end = start + 7 * DAY_MS;
    const values: Record<string, number | null> = {};
    for (const arm of ARMS) {
      const users = data.users.filter((u) => u.arm === arm && Date.parse(u.created_at) < end);
      const scans = sum(users.map((u) => (data.verifiedByUser.get(u.id) ?? []).filter((t) => t >= start && t < end).length));
      values[arm] = users.length ? round(scans / users.length, 2) : null;
    }
    weekly.push({ week: w, values });
  }
  return { arms: armTable(ctx, data), weekly, byFaculty: participants(ctx).byFaculty };
}

const quantile = (sorted: number[], q: number) => {
  if (!sorted.length) return null;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
};

/**
 * Descriptive analysis per hypothesis for the research console. Inferential tests (ITS, regression)
 * belong in the exported data; these figures are for monitoring the pilot.
 */
export function analysis(ctx: Ctx) {
  const s = readSettings(ctx);
  const clock = studyClock(ctx, s);
  const { last } = weekWindow(clock.week, s);
  const tz = ctx.config.tzOffsetMin;
  const shift = sqlShift(tz);
  const data = loadUserScans(ctx);
  const now = ctx.now().getTime();
  const { impact, cupCostVnd } = ctx.config;

  // ---- environment (H3 of the Introduction / H1 of the grant) ----
  const weekly = new Map<number, number>();
  for (const r of ctx.all('SELECT date(created_at, ?) AS day, COUNT(*) AS n FROM scans WHERE verified = 1 GROUP BY day', shift)) {
    const w = clock.weekOfDay(r.day);
    weekly.set(w, (weekly.get(w) ?? 0) + r.n);
  }
  let cumulative = 0;
  const impactSeries = [];
  for (let w = 1; w <= last; w++) {
    cumulative += weekly.get(w) ?? 0;
    impactSeries.push({ week: w, cups: weekly.get(w) ?? 0, cumulative });
  }
  const verified = ctx.get('SELECT COUNT(*) AS n, COALESCE(SUM(discount_vnd), 0) AS discounts FROM scans WHERE verified = 1')!;
  const band = (x: number) => ({ value: x, low: x * (1 - impact.uncertainty), high: x * (1 + impact.uncertainty) });
  const environment = {
    cups: verified.n as number,
    plasticKg: band((verified.n * impact.plasticGramsPerCup) / 1000),
    co2eKg: band((verified.n * impact.co2eGramsPerCup) / 1000),
    perParticipant: data.users.length ? round(verified.n / data.users.length, 1) : null,
    outletSavingsVnd: verified.n * cupCostVnd,
    discountsVnd: verified.discounts as number,
    coefficients: impact,
    series: impactSeries,
  };

  // ---- H1: reuse share before / after the intervention, per cluster ----
  const shares = vendorDayShares(ctx, s);
  const clusters = [...new Set(ctx.all('SELECT cluster FROM vendors').map((v) => v.cluster as string))].sort().map((cluster) => {
    const pre = ratio(shares.filter((r) => r.cluster === cluster && !r.intervention));
    const post = ratio(shares.filter((r) => r.cluster === cluster && r.intervention));
    return { cluster, startWeek: clock.clusterStart(cluster), pre: round(pre), post: round(post), diffPp: pre !== null && post !== null ? round((post - pre) * 100, 1) : null };
  });
  const prePooled = ratio(shares.filter((r) => !r.intervention));
  const postPooled = ratio(shares.filter((r) => r.intervention));
  const shareSeries = [];
  for (let w = 1; w <= last; w++) shareSeries.push({ week: w, share: round(ratio(shares.filter((r) => r.week === w))) });

  // ---- H2: retention curve by arm (week k after sign-up) and the reward withdrawal ----
  const curve = (users: Row[]) =>
    Array.from({ length: 8 }, (_, k) => {
      const eligible = users.filter((u) => Date.parse(u.created_at) <= now - (k + 1) * 7 * DAY_MS);
      if (eligible.length < 5) return null;
      const active = eligible.filter((u) => {
        const from = Date.parse(u.created_at) + k * 7 * DAY_MS;
        return (data.verifiedByUser.get(u.id) ?? []).some((t) => t >= from && t < from + 7 * DAY_MS);
      });
      return round(active.length / eligible.length);
    });
  const retentionCurves = ARMS.map((arm) => ({ arm, letter: ARM_LETTER[arm], values: curve(data.users.filter((u) => u.arm === arm)) }));

  const rewardsEndMs = Date.parse(`${addDays(s.rewardsEnd, 1)}T00:00:00Z`) - tz * 60_000;
  const rate = (users: Row[], from: number, to: number) => {
    const inWindow = users.filter((u) => Date.parse(u.created_at) < from);
    if (!inWindow.length || to <= from) return null;
    const scans = sum(inWindow.map((u) => (data.verifiedByUser.get(u.id) ?? []).filter((t) => t >= from && t < to).length));
    return round(scans / inWindow.length / ((to - from) / (7 * DAY_MS)), 2);
  };
  const afterEnd = Math.min(now, rewardsEndMs + 14 * DAY_MS);
  const withdrawal = {
    rewardsEnd: s.rewardsEnd,
    started: now > rewardsEndMs,
    arms: (['gamification', 'rewards'] as const).map((arm) => {
      const users = data.users.filter((u) => u.arm === arm);
      return { arm, letter: ARM_LETTER[arm], before: rate(users, rewardsEndMs - 14 * DAY_MS, rewardsEndMs), after: now > rewardsEndMs ? rate(users, rewardsEndMs, afterEnd) : null };
    }),
  };

  // ---- H3: NFC vs QR at the counter, and adoption by cup type ----
  const tx = new Map<string, number[]>();
  const counts = new Map<string, number>();
  for (const r of ctx.all('SELECT method, tx_duration_ms FROM scans WHERE tier = 1')) {
    counts.set(r.method, (counts.get(r.method) ?? 0) + 1);
    if (r.tx_duration_ms) tx.set(r.method, [...(tx.get(r.method) ?? []), r.tx_duration_ms]);
  }
  const kindOf = new Map(ctx.all('SELECT user_id, MIN(kind) AS kind FROM cups WHERE user_id IS NOT NULL GROUP BY user_id').map((r) => [r.user_id as string, r.kind as string]));
  const technology = (['nfc', 'qr'] as const).map((method) => {
    const sorted = (tx.get(method) ?? []).slice().sort((a, b) => a - b);
    const users = data.users.filter((u) => kindOf.get(u.id) === method);
    return {
      method,
      scans: counts.get(method) ?? 0,
      timed: sorted.length,
      p25: quantile(sorted, 0.25),
      median: quantile(sorted, 0.5),
      p75: quantile(sorted, 0.75),
      users: users.length,
      scansPerWeek: round(scansPerWeek(ctx, users, data), 2),
      retentionW4: round(retention(ctx, users, data, 4)),
    };
  });

  // ---- when cups are reused: weekday × hour (verified, local time) ----
  const heat = ctx.all(
    `SELECT CAST(strftime('%w', created_at, ?) AS INTEGER) AS dow, CAST(strftime('%H', created_at, ?) AS INTEGER) AS hour, COUNT(*) AS n
     FROM scans WHERE verified = 1 GROUP BY dow, hour`,
    shift,
    shift,
  );

  return {
    week: clock.week,
    environment,
    h1: { clusters, pre: round(prePooled), post: round(postPooled), diffPp: prePooled !== null && postPooled !== null ? round((postPooled - prePooled) * 100, 1) : null, series: shareSeries },
    h2: { retentionCurves, withdrawal },
    h3: { technology },
    heatmap: heat.map((r) => ({ dow: r.dow as number, hour: r.hour as number, n: r.n as number })),
  };
}

/** Numbers for the student-facing celebration and vendor "today" screens reuse the same coefficients. */
export const impactPerCup = (ctx: Ctx) => ({ ...impactOf(1, ctx.config.impact), singleUseCo2eGrams: ctx.config.impact.singleUseCupCo2eGrams });

export function vendorToday(ctx: Ctx, vendorId: string) {
  const tz = ctx.config.tzOffsetMin;
  const today = localDay(ctx.now(), tz);
  const shift = sqlShift(tz);
  const byHourRows = ctx.all(
    `SELECT CAST(strftime('%H', created_at, ?) AS INTEGER) AS hour, COUNT(*) AS n FROM scans
     WHERE vendor_id = ? AND verified = 1 AND date(created_at, ?) = ? GROUP BY hour`,
    shift,
    vendorId,
    shift,
    today,
  );
  const scansToday = sum(byHourRows.map((r) => r.n));
  const day = ctx.get('SELECT drinks_total, reusable_observed FROM vendor_days WHERE vendor_id = ? AND day = ?', vendorId, today);
  const month = ctx.get(
    `SELECT COUNT(*) AS n FROM scans WHERE vendor_id = ? AND verified = 1 AND strftime('%Y-%m', created_at, ?) = ?`,
    vendorId,
    shift,
    today.slice(0, 7),
  )!.n as number;
  const recent = ctx.all(
    `SELECT s.id, s.tier, s.method, s.source, s.tx_duration_ms, s.discount_vnd, s.created_at, c.code AS cup_code, s.user_id IS NOT NULL AS linked
     FROM scans s JOIN cups c ON c.id = s.cup_id WHERE s.vendor_id = ? ORDER BY s.created_at DESC LIMIT 30`,
    vendorId,
  );
  const drinks = day?.drinks_total ?? null;
  return {
    day: today,
    scansToday,
    drinksTotal: drinks,
    share: drinks ? Math.min(1, scansToday / drinks) : null,
    byHour: byHourRows.map((r) => ({ hour: r.hour, n: r.n })),
    savedVnd: scansToday * ctx.config.cupCostVnd,
    monthCount: month,
    recent,
    lastWeekDays: ctx.all('SELECT day, drinks_total, reusable_observed FROM vendor_days WHERE vendor_id = ? AND day >= ? ORDER BY day DESC', vendorId, addDays(today, -7)),
  };
}
