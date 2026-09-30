// Weekly leagues (Mon–Sun). Participants with gamification are split into groups of up to
// `league.groupSize` per tier; the top `league.promote` of each group move up a tier next week.
// There is no relegation: the ethics plan rules out features that rank people negatively.
import { featuresFor, initials, shortName } from '../domain.ts';
import type { Ctx, Row } from '../http.ts';
import { addDays, dayStartIso, daysBetween, localDay, mondayOf } from '../time.ts';
import { readSettings, studyClock } from './settings.ts';

export const TOP_TIER = 2; // 0 = Green, 1 = Gold, 2 = Diamond

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededShuffle<T>(items: T[], seed: string): T[] {
  let state = hash(seed);
  const rnd = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function eligibleUsers(ctx: Ctx, week: string): Row[] {
  const clock = studyClock(ctx, readSettings(ctx));
  const weekEnd = dayStartIso(addDays(week, 7), ctx.config.tzOffsetMin);
  return ctx
    .all('SELECT id, arm FROM users WHERE created_at < ? ORDER BY id', weekEnd)
    .filter((u) => featuresFor(u.arm, { studyMode: ctx.config.studyMode, studyEnded: clock.studyEnded }).gamification);
}

/** Verified cups per participant in a league week — self-scans do not count toward rankings. */
function weekCounts(ctx: Ctx, week: string): Map<string, number> {
  const tz = ctx.config.tzOffsetMin;
  const rows = ctx.all(
    `SELECT user_id, COUNT(*) AS n FROM scans
     WHERE verified = 1 AND user_id IS NOT NULL AND created_at >= ? AND created_at < ? GROUP BY user_id`,
    dayStartIso(week, tz),
    dayStartIso(addDays(week, 7), tz),
  );
  return new Map(rows.map((r) => [r.user_id as string, r.n as number]));
}

function rankGroup(members: Row[], counts: Map<string, number>) {
  return members
    .map((m) => ({ ...m, cups: counts.get(m.user_id) ?? 0 }))
    .sort((a, b) => b.cups - a.cups || String(a.nickname).localeCompare(String(b.nickname)))
    .map((m, i) => ({ ...m, rank: i + 1 }));
}

function membersOf(ctx: Ctx, week: string, groupNo?: number): Row[] {
  const sql = `SELECT lm.user_id, lm.tier, lm.group_no, u.nickname FROM league_members lm JOIN users u ON u.id = lm.user_id WHERE lm.week = ?`;
  return groupNo === undefined ? ctx.all(sql, week) : ctx.all(`${sql} AND lm.group_no = ?`, week, groupNo);
}

function buildWeek(ctx: Ctx, week: string, prevWeek: string | null) {
  const { groupSize, promote } = ctx.config.league;
  const tierOf = new Map<string, number>();
  if (prevWeek) {
    const counts = weekCounts(ctx, prevWeek);
    const groups = new Map<number, Row[]>();
    for (const m of membersOf(ctx, prevWeek)) groups.set(m.group_no, [...(groups.get(m.group_no) ?? []), m]);
    for (const members of groups.values()) {
      for (const m of rankGroup(members, counts)) {
        const promoted = m.rank <= promote && m.cups > 0 && m.tier < TOP_TIER;
        tierOf.set(m.user_id, promoted ? m.tier + 1 : m.tier);
      }
    }
  }
  const byTier = new Map<number, string[]>();
  for (const u of eligibleUsers(ctx, week)) {
    const tier = tierOf.get(u.id) ?? 0;
    byTier.set(tier, [...(byTier.get(tier) ?? []), u.id]);
  }
  for (const [tier, ids] of byTier) {
    const shuffled = seededShuffle(ids, `${week}:${tier}`);
    const groups = Math.max(1, Math.ceil(shuffled.length / groupSize));
    shuffled.forEach((id, i) => {
      ctx.run('INSERT INTO league_members (week, user_id, tier, group_no) VALUES (?, ?, ?, ?)', week, id, tier, tier * 1000 + (i % groups));
    });
  }
}

/** Participants who became eligible after the week was drawn join the emptiest Green group. */
function addLateJoiners(ctx: Ctx, week: string) {
  const present = new Set(ctx.all('SELECT user_id FROM league_members WHERE week = ?', week).map((r) => r.user_id));
  const missing = eligibleUsers(ctx, week).filter((u) => !present.has(u.id));
  if (!missing.length) return;
  const sizes = ctx.all('SELECT group_no, COUNT(*) AS n FROM league_members WHERE week = ? AND tier = 0 GROUP BY group_no', week);
  for (const u of missing) {
    let group = sizes.filter((g) => g.n < ctx.config.league.groupSize).sort((a, b) => a.n - b.n)[0];
    if (!group) {
      group = { group_no: sizes.length ? Math.max(...sizes.map((g) => g.group_no)) + 1 : 0, n: 0 };
      sizes.push(group);
    }
    ctx.run('INSERT INTO league_members (week, user_id, tier, group_no) VALUES (?, ?, 0, ?)', week, u.id, group.group_no);
    group.n++;
  }
}

/** Make sure the week's groups exist, drawing every week since the last one that was drawn. */
export function ensureWeek(ctx: Ctx, week: string) {
  ctx.tx(() => {
    if (!ctx.get('SELECT 1 FROM league_members WHERE week = ? LIMIT 1', week)) {
      const latest = ctx.get('SELECT MAX(week) AS w FROM league_members WHERE week < ?', week)?.w as string | null;
      if (!latest) buildWeek(ctx, week, null);
      else for (let w = addDays(latest, 7); w <= week; w = addDays(w, 7)) buildWeek(ctx, w, addDays(w, -7));
    }
    addLateJoiners(ctx, week);
  });
}

export function leagueFor(ctx: Ctx, userId: string) {
  const today = localDay(ctx.now(), ctx.config.tzOffsetMin);
  const week = mondayOf(today);
  ensureWeek(ctx, week);
  const me = ctx.get('SELECT tier, group_no FROM league_members WHERE week = ? AND user_id = ?', week, userId);
  if (!me) return null;
  const ranked = rankGroup(membersOf(ctx, week, me.group_no), weekCounts(ctx, week));
  const mine = ranked.find((m) => m.user_id === userId)!;
  return {
    week,
    tier: me.tier as number,
    topTier: me.tier >= TOP_TIER,
    promote: ctx.config.league.promote,
    daysLeft: 7 - daysBetween(week, today),
    rank: mine.rank,
    members: ranked.map((m) => ({
      rank: m.rank,
      name: shortName(m.nickname),
      initials: initials(m.nickname),
      cups: m.cups,
      me: m.user_id === userId,
    })),
  };
}
