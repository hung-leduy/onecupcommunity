// Fills the database with a deterministic, clearly-labelled DEMO pilot (≈380 participants, 11 weeks)
// so the research console and the apps can be reviewed before real data exists.
//   npm run seed:demo -w server            (refuses to touch a database that already has participants)
//   npm run seed:demo -w server -- --force (wipes it first)
import { loadConfig } from './config.ts';
import { openDb } from './db.ts';
import { ARMS, newId, newToken, type Arm } from './domain.ts';
import { makeCtx } from './http.ts';
import { seedPilot } from './seed.ts';
import { writeSettings } from './services/settings.ts';
import { addDays, DAY_MS, dayOfWeek, dayStartIso, localDay, mondayOf } from './time.ts';

const config = loadConfig();
const db = openDb(config.dbPath);
const ctx = makeCtx(db, config);
const tz = config.tzOffsetMin;
const force = process.argv.includes('--force');

if (ctx.get('SELECT 1 FROM users LIMIT 1') && !force) {
  console.error('Cơ sở dữ liệu đã có người tham gia. Chạy lại với --force để xoá và tạo dữ liệu mẫu.');
  process.exit(1);
}

// ---- deterministic randomness --------------------------------------------------------------
let seed = 20270412;
const rnd = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = <T>(xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)];
const weighted = <T>(pairs: [T, number][]) => {
  let r = rnd() * pairs.reduce((a, [, w]) => a + w, 0);
  for (const [v, w] of pairs) if ((r -= w) <= 0) return v;
  return pairs[pairs.length - 1][0];
};
const normal = (mean: number, sd: number) => mean + sd * Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());
const poisson = (lambda: number) => {
  let k = 0;
  for (let p = Math.exp(-lambda), s = p, u = rnd(); u > s; k++) {
    p *= lambda / (k + 1);
    s += p;
  }
  return k;
};
const hex = (bytes: number) => Array.from({ length: bytes }, () => Math.floor(rnd() * 256).toString(16).padStart(2, '0')).join('').toUpperCase();
const CODE = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const usedCodes = new Set<string>();
const code = () => {
  let c = '';
  do c = Array.from({ length: 6 }, () => pick([...CODE])).join('');
  while (usedCodes.has(c));
  usedCodes.add(c);
  return c;
};

// ---- wipe & calendar -----------------------------------------------------------------------
const now = new Date();
const nowMs = now.getTime();
const today = localDay(now, tz);
const pilotStart = addDays(mondayOf(today), -70); // today falls in pilot week 11 of 12
const at = (day: string, hour: number) => new Date(Date.parse(dayStartIso(day, tz)) + hour * 3600_000);

ctx.tx(() => {
  for (const table of ['league_members', 'redemptions', 'rewards', 'scan_flags', 'scans', 'vendor_days', 'cups', 'users', 'vendors', 'settings']) {
    ctx.run(`DELETE FROM ${table}`);
  }
});

seedPilot(ctx, () => {});
writeSettings(ctx, {
  pilotStart,
  pilotWeeks: 12,
  studyEnd: addDays(pilotStart, 79),
  rewardsEnd: addDays(pilotStart, 76),
  clusterStarts: { A: 1, B: 5, C: 9 },
  demo: true,
});
const vendors = ctx.all('SELECT * FROM vendors');
const vendorByName = new Map(vendors.map((v) => [v.name as string, v]));
const starts: Record<string, number> = { A: 1, B: 5, C: 9 };
const weekOf = (day: string) => Math.floor((Date.parse(day) - Date.parse(pilotStart)) / (7 * DAY_MS)) + 1;
const started = (vendor: { cluster: string }, week: number) => week >= starts[vendor.cluster];

// ---- participants --------------------------------------------------------------------------
const GIVEN = ['Minh Anh', 'Thu Hà', 'Đức Bảo', 'Phương Linh', 'Gia Huy', 'Khánh Chi', 'Quốc Bảo', 'Ngọc Mai', 'Hoàng Nam', 'Thảo Vy', 'Tuấn Kiệt', 'Bảo Ngọc', 'Minh Khoa', 'Hải Yến', 'Đăng Khoa', 'Mai Anh', 'Thanh Tùng', 'Hồng Nhung', 'Anh Thư', 'Việt Hoàng', 'Trọng Nhân', 'Diệu Linh', 'Quang Huy', 'Ngọc Hân'];
const FAMILY = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương'];
const REG_WEEK: [number, number][] = [[1, 30], [2, 15], [3, 6], [4, 4], [5, 14], [6, 6], [7, 3], [8, 3], [9, 9], [10, 5], [11, 5]];
// Per-arm engagement: scans per active week and weekly probability of staying active.
const ENGAGE: Record<Arm, { rate: number; stay: number }> = {
  control: { rate: 2.6, stay: 0.85 },
  feedback: { rate: 3.3, stay: 0.89 },
  gamification: { rate: 3.9, stay: 0.92 },
  rewards: { rate: 4.3, stay: 0.93 },
};
const HOME: [string, number][] = [['Campus Café', 35], ['Kiosk North', 20], ['Canteen Block B', 28], ['Library Kiosk', 17]];

const armCounts = new Map<string, Record<string, number>>();
function arm(faculty: string): Arm {
  const c = armCounts.get(faculty) ?? {};
  const min = Math.min(...ARMS.map((a) => c[a] ?? 0));
  const a = pick(ARMS.filter((x) => (c[x] ?? 0) === min));
  c[a] = (c[a] ?? 0) + 1;
  armCounts.set(faculty, c);
  return a;
}

type Person = { id: string; arm: Arm; created: number; cupId: string; cupKind: 'qr' | 'nfc'; home: string };
const people: Person[] = [];
const insertUser = ctx.db.prepare(
  `INSERT INTO users (id, token, nickname, arm, preferred_method, consent_participate, consent_research, created_at, faculty, intake, consent_open_data)
   VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)`,
);
const insertCup = ctx.db.prepare('INSERT INTO cups (id, kind, code, nfc_uid, user_id, linked_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');

function addPerson(p: { name: string; faculty: string; intake: string | null; arm?: Arm; created: Date; kind?: 'qr' | 'nfc'; home?: string; research?: boolean; open?: boolean }) {
  const id = newId();
  const kind = p.kind ?? (rnd() < 0.3 ? 'nfc' : 'qr');
  const research = p.research ?? rnd() < 0.86;
  const a = p.arm ?? arm(p.faculty);
  const token = newToken();
  insertUser.run(id, token, p.name, a, kind, research ? 1 : 0, p.created.toISOString(), p.faculty, p.intake, research && (p.open ?? rnd() < 0.4) ? 1 : 0);
  const cupId = newId();
  insertCup.run(cupId, kind, code(), kind === 'nfc' ? `04${hex(6)}` : null, id, p.created.toISOString(), p.created.toISOString());
  const person = { id, arm: a, created: p.created.getTime(), cupId, cupKind: kind, home: p.home ?? weighted(HOME) };
  people.push(person);
  return { ...person, token };
}

// ---- scans ---------------------------------------------------------------------------------
const insertScan = ctx.db.prepare(
  `INSERT INTO scans (id, cup_id, user_id, vendor_id, tier, verified, method, source, tx_duration_ms, discount_vnd, points, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
);
const verifiedAt = new Map<string, number>(); // vendor|day → verified scans

function scan(p: { cupId: string; userId: string | null; kind: 'qr' | 'nfc' }, t: Date, vendorName: string, tier?: 1 | 2 | 3) {
  const vendor = vendorByName.get(vendorName)!;
  const tr = tier ?? weighted<1 | 2 | 3>([[1, 78], [2, 13], [3, 9]]);
  const source = tr === 3 ? 'self' : tr === 2 ? 'station' : p.kind === 'nfc' ? weighted([['usb-hid', 7], ['pcsc-bridge', 3]]) : weighted([['camera', 85], ['manual', 15]]);
  // H3: NFC taps are quicker than camera QR scans at the counter.
  const tx = tr === 1 && rnd() < 0.3 ? Math.round(Math.max(700, p.kind === 'nfc' ? normal(2100, 600) : normal(4300, 1200))) : null;
  const linked = !!p.userId;
  insertScan.run(
    newId(), p.cupId, p.userId, tr === 3 ? null : vendor.id, tr, tr === 3 ? 0 : 1, p.kind, source, tx,
    linked && tr !== 3 ? vendor.discount_vnd : 0, linked ? (tr === 3 ? config.points.self : config.points.verified) : 0, t.toISOString(),
  );
  if (tr !== 3) {
    const key = `${vendor.id}|${localDay(t, tz)}`;
    verifiedAt.set(key, (verifiedAt.get(key) ?? 0) + 1);
  }
}

/** A plausible serving time: weekdays, peaks around 10:00 and 14:00. */
function servingTime(week: number): Date {
  const day = addDays(pilotStart, (week - 1) * 7 + weighted([[0, 20], [1, 20], [2, 20], [3, 20], [4, 17], [5, 3]]));
  const hour = Math.min(16.9, Math.max(7, rnd() < 0.55 ? normal(10, 1.3) : normal(14, 1.2)));
  return at(day, hour);
}

const FACULTY: [string, number][] = [['eng', 45], ['em', 35], ['ace', 12], ['staff', 8]];

ctx.tx(() => {
  // The demo participant from the design: Minh Anh Lê, Engineering, class of 2025, arm D.
  const demo = addPerson({ name: 'Minh Anh Lê', faculty: 'eng', intake: '2025', arm: 'rewards', created: at(pilotStart, 8.5), kind: 'qr', home: 'Campus Café', research: true, open: false });

  for (let i = 0; i < 385; i++) {
    const faculty = weighted(FACULTY);
    const week = weighted(REG_WEEK);
    const created = new Date(Math.min(nowMs - 3600_000, servingTime(week).getTime() - 3600_000));
    addPerson({ name: `${pick(GIVEN)} ${pick(FAMILY)}`, faculty, intake: faculty === 'staff' ? null : String(weighted([[2022, 2], [2023, 3], [2024, 3], [2025, 3], [2026, 2]])), created });
  }

  const currentWeek = weekOf(today);
  for (const p of people.slice(1)) {
    const personal = Math.exp(normal(0, 0.35));
    for (let w = weekOf(localDay(p.created, tz)); w <= currentWeek; w++) {
      if (w > weekOf(localDay(p.created, tz)) && rnd() > ENGAGE[p.arm].stay) break;
      for (let k = poisson(ENGAGE[p.arm].rate * personal); k > 0; k--) {
        const t = servingTime(w);
        if (t.getTime() <= p.created || t.getTime() >= nowMs) continue;
        const open = vendors.filter((v) => started(v, w));
        const home = vendorByName.get(p.home)!;
        scan({ cupId: p.cupId, userId: p.id, kind: p.cupKind }, t, started(home, w) && rnd() < 0.8 ? home.name : pick(open).name);
      }
    }
  }

  // Minh Anh: a 12-weekday streak of 3 cups/day, 2 cups so far today, 47 cups in total.
  const self = { cupId: demo.cupId, userId: demo.id, kind: demo.cupKind };
  let streakDays: string[] = [];
  for (let d = addDays(today, -1); streakDays.length < 12; d = addDays(d, -1)) if (dayOfWeek(d) !== 0 && dayOfWeek(d) !== 6) streakDays.push(d);
  for (const d of streakDays) for (const h of [8.2, 11.6, 15.1]) scan(self, at(d, h), 'Campus Café', 1);
  for (const minutesAgo of [150, 40]) scan(self, new Date(nowMs - minutesAgo * 60_000), 'Campus Café', 1);
  const earliest = streakDays[streakDays.length - 1];
  let extra = 47 - 12 * 3 - 2;
  for (let d = addDays(earliest, -2); extra > 0; d = addDays(d, -2)) {
    if (dayOfWeek(d) === 0) continue;
    scan(self, at(d, 10.4), weighted([['Campus Café', 3], ['Kiosk North', 1]]), 1);
    extra--;
  }

  // Outlet day counts: observation before the cluster starts, all drinks served every day.
  for (const v of vendors) {
    const size = { 'Campus Café': 1.25, 'Kiosk North': 0.8, 'Canteen Block B': 1.1, 'Library Kiosk': 0.75 }[v.name as string] ?? 1;
    for (let d = pilotStart; d <= today; d = addDays(d, 1)) {
      const dow = dayOfWeek(d);
      if (dow === 0) continue;
      const week = weekOf(d);
      const scans = verifiedAt.get(`${v.id}|${d}`) ?? 0;
      let drinks: number;
      let observed: number | null = null;
      if (!started(v, week)) {
        drinks = Math.round(normal(190, 25) * size * (dow === 6 ? 0.4 : 1));
        observed = Math.round(drinks * Math.min(0.2, Math.max(0.06, normal(0.12, 0.02))));
      } else {
        const weeksIn = week - starts[v.cluster];
        const target = Math.min(0.4, 0.2 + 0.02 * weeksIn + normal(0, 0.015));
        drinks = Math.max(scans + 5, Math.round(scans / Math.max(0.12, target)));
        if (d === today) drinks = Math.max(scans + 3, Math.round(scans / 0.62));
      }
      ctx.run('INSERT INTO vendor_days (vendor_id, day, drinks_total, reusable_observed, updated_at) VALUES (?, ?, ?, ?, ?)', v.id, d, drinks, observed, now.toISOString());
    }
  }

  // A few verified scans of cups nobody has linked yet, and duplicate taps held for review.
  for (let i = 0; i < 60; i++) {
    const w = 1 + Math.floor(rnd() * weekOf(today));
    const open = vendors.filter((v) => started(v, w));
    const cupId = newId();
    const kind = rnd() < 0.5 ? 'qr' : 'nfc';
    insertCup.run(cupId, kind, code(), kind === 'nfc' ? `04${hex(6)}` : null, null, null, at(pilotStart, 7).toISOString());
    const t = servingTime(w);
    if (t.getTime() < nowMs) scan({ cupId, userId: null, kind }, t, pick(open).name, 1);
  }
  const recentScans = ctx.all('SELECT cup_id, user_id, vendor_id, tier, created_at FROM scans WHERE created_at >= ? ORDER BY RANDOM() LIMIT 14', new Date(nowMs - 6 * DAY_MS).toISOString());
  for (const s of recentScans) {
    ctx.run(
      'INSERT INTO scan_flags (id, cup_id, user_id, vendor_id, tier, reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      newId(), s.cup_id, s.user_id, s.vendor_id, s.tier, 'cooldown', new Date(Date.parse(s.created_at) + 50_000).toISOString(),
    );
  }

  // Some rewards-arm participants have redeemed vouchers.
  const rewards = ctx.all('SELECT * FROM rewards ORDER BY cost_points');
  for (const p of people.slice(1).filter((x) => x.arm === 'rewards')) {
    const points = ctx.get('SELECT COALESCE(SUM(points), 0) AS n FROM scans WHERE user_id = ?', p.id)!.n;
    const reward = rewards.filter((r) => r.cost_points <= points).pop();
    if (!reward || rnd() > 0.35) continue;
    const when = new Date(nowMs - rnd() * 20 * DAY_MS).toISOString();
    const used = rnd() < 0.7;
    ctx.run(
      `INSERT INTO redemptions (id, user_id, reward_id, cost_points, voucher, status, used_vendor_id, created_at, used_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      newId(), p.id, reward.id, reward.cost_points, code(), used ? 'used' : 'issued', used ? reward.vendor_id : null, when, used ? when : null,
    );
  }

  console.log(`DỮ LIỆU MẪU: ${people.length} người tham gia, ${ctx.get('SELECT COUNT(*) AS n FROM scans')!.n} lượt quét, pilot tuần ${weekOf(today)}/12 (bắt đầu ${pilotStart}).`);
  console.log(`Người dùng mẫu "Minh Anh Lê": ${config.publicUrl}/me#t=${demo.token}`);
  console.log('Quầy: PIN 1111 Campus Café · 2222 Kiosk North · 3333 Canteen Block B · 4444 Library Kiosk');
  console.log(`Console: ${config.publicUrl}/admin (admin key: ${config.adminKey})`);
});
