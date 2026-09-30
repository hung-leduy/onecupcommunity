import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, describe, test } from 'node:test';
import { createApp } from '../src/app.ts';
import { loadConfig, type Config } from '../src/config.ts';
import { openDb } from '../src/db.ts';
import { currentStationCode } from '../src/domain.ts';

// Controllable clock. Starts on Thursday 1 Oct 2026, 10:00 in Viet Nam (03:00 UTC).
let clock = Date.parse('2026-10-01T03:00:00Z');
const tick = (minutes: number) => {
  clock += minutes * 60_000;
};
/** Jump forward to a local wall-clock time, e.g. "2026-10-05T09:00". */
const goLocal = (local: string) => {
  const t = Date.parse(`${local}:00Z`) - 7 * 3600_000;
  assert.ok(t >= clock, 'the test clock only moves forward');
  clock = t;
};

const admin = { 'x-admin-key': 'test-admin' };
const auth = (token: string) => ({ authorization: `Bearer ${token}` });

async function start(overrides: Partial<Config> = {}) {
  const config = loadConfig({
    dbPath: ':memory:',
    adminKey: 'test-admin',
    stationSecret: 'test-secret',
    publicUrl: 'https://cup.test',
    studyMode: 'off',
    pilot: { start: '2026-09-28', weeks: 12, studyEnd: '2026-12-20', rewardsEnd: '2026-12-13' },
    ...overrides,
  });
  const server: Server = createApp(openDb(':memory:'), config, { now: () => new Date(clock) }).listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  async function call(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
    const res = await fetch(base + path, {
      method,
      headers: { 'content-type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let data: any = text;
    try {
      data = JSON.parse(text);
    } catch {}
    return { status: res.status, data };
  }
  return { server, call };
}

describe('One-Cup API', () => {
  let api: Awaited<ReturnType<typeof start>>;
  let call: (typeof api)['call'];
  let vendorToken = '';
  let vendorId = '';
  let rewardId = '';
  let lan = '';
  let qrCups: any[] = [];

  before(async () => {
    api = await start();
    call = api.call;
  });
  after(() => api.server.close());

  test('admin sets up an outlet, a reward and QR cups', async () => {
    assert.equal((await call('GET', '/api/admin/overview')).status, 401);
    const v = await call('POST', '/api/admin/vendors', { name: 'Campus Café', pin: '1234', discountVnd: 3000, cluster: 'A', stationLabel: 'Trạm 1' }, admin);
    assert.equal(v.status, 201);
    vendorId = v.data.id;
    assert.deepEqual((await call('POST', '/api/admin/vendors', { name: 'X', pin: '1234' }, admin)).data, { error: 'pin_taken' });
    const rewards = await call('POST', '/api/admin/rewards', { titleVi: 'Upsize miễn phí', titleEn: 'Free upsize', cost: 20, vendorId }, admin);
    rewardId = rewards.data[0].id;
    const cups = await call('POST', '/api/admin/cups', { count: 4 }, admin);
    qrCups = cups.data;
    assert.equal(qrCups.length, 4);
    assert.match(qrCups[0].url, /^https:\/\/cup\.test\/c\/[A-Z0-9]{6}$/);
    assert.equal(qrCups[0].displayCode, `OCC-${qrCups[0].code}`);
  });

  test('vendor logs in with PIN', async () => {
    assert.deepEqual((await call('POST', '/api/vendor/login', { pin: '0000' })).data, { error: 'bad_pin' });
    const r = await call('POST', '/api/vendor/login', { pin: '1234' });
    vendorToken = r.data.token;
    assert.equal(r.data.vendor.stationLabel, 'Trạm 1');
    assert.equal(r.data.vendor.discountVnd, 3000);
  });

  test('registration needs consent and balances the arms within a faculty', async () => {
    assert.deepEqual((await call('POST', '/api/users', { nickname: 'A' })).data, { error: 'consent_required' });
    for (let i = 0; i < 8; i++) await call('POST', '/api/users', { consentParticipate: true, faculty: 'em' });
    const p = await call('GET', '/api/admin/participants', undefined, admin);
    const em = p.data.byFaculty.find((f: any) => f.faculty === 'em');
    assert.deepEqual([em.control, em.feedback, em.gamification, em.rewards], [2, 2, 2, 2]);

    const r = await call('POST', '/api/users', { nickname: 'Lan Nguyễn', faculty: 'eng', intake: '2025', consentParticipate: true, consentResearch: true, consentOpenData: true });
    assert.equal(r.status, 201);
    lan = r.data.token;
    assert.equal(r.data.arm, undefined, 'the arm stays blinded');
    assert.deepEqual(r.data.features, { impactFeedback: true, gamification: true, rewards: true }); // study mode off
    assert.equal(r.data.user.faculty, 'eng');
    assert.equal(r.data.user.consentOpenData, true);
    assert.equal(r.data.points, 0);
  });

  test('student links a QR cup and cannot take someone else’s', async () => {
    const r = await call('POST', '/api/me/cups', { code: `occ-${qrCups[0].code}` }, auth(lan));
    assert.equal(r.status, 201);
    assert.equal(r.data.cups[0].code, qrCups[0].code);
    const other = await call('POST', '/api/users', { consentParticipate: true });
    assert.deepEqual((await call('POST', '/api/me/cups', { code: qrCups[0].url }, auth(other.data.token))).data, { error: 'cup_taken' });
  });

  test('counter scan is verified, earns points and a discount; a double scan is flagged', async () => {
    const r = await call('POST', '/api/vendor/scans', { method: 'qr', source: 'camera', value: qrCups[0].url, txDurationMs: 4200 }, auth(vendorToken));
    assert.equal(r.data.status, 'ok');
    assert.equal(r.data.discountVnd, 3000);
    assert.equal(r.data.points, 10);
    assert.equal(r.data.cup.displayCode, `OCC-${qrCups[0].code}`);
    tick(1);
    const again = await call('POST', '/api/vendor/scans', { method: 'qr', source: 'manual', value: `OCC-${qrCups[0].code}` }, auth(vendorToken));
    assert.equal(again.data.status, 'duplicate');
    const q = await call('GET', '/api/admin/quality', undefined, admin);
    assert.equal(q.data.flagsThisWeek, 1);
    assert.equal(q.data.flags[0].reason, 'cooldown');
  });

  test('NFC sticker: unknown → registered at the counter → claimed by the student → tapped', async () => {
    const uid = '04:A2:3B:4C:5D:6E:7F';
    const unknown = await call('POST', '/api/vendor/scans', { method: 'nfc', source: 'usb-hid', value: uid }, auth(vendorToken));
    assert.deepEqual(unknown.data, { status: 'unknown', method: 'nfc', uid: '04A23B4C5D6E7F' });
    const reg = await call('POST', '/api/vendor/tags', { uid: '04a23b4c5d6e7f' }, auth(vendorToken));
    assert.equal(reg.status, 201);
    const unlinked = await call('POST', '/api/vendor/scans', { method: 'nfc', source: 'pcsc-bridge', value: uid }, auth(vendorToken));
    assert.equal(unlinked.data.status, 'unlinked');
    assert.equal(unlinked.data.discountVnd, 0);
    await call('POST', '/api/me/cups', { code: reg.data.cup.code }, auth(lan));
    tick(3);
    const ok = await call('POST', '/api/vendor/scans', { method: 'nfc', source: 'usb-hid', value: '04A23B4C5D6E7F' }, auth(vendorToken));
    assert.equal(ok.data.status, 'ok');
    assert.equal((await call('POST', '/api/vendor/scans', { method: 'nfc', source: 'usb-hid', value: 'hello' }, auth(vendorToken))).data.error, 'bad_uid');
  });

  test('station code: 6 digits, typed without the outlet, guesses are rate-limited', async () => {
    tick(11);
    const { data } = await call('GET', '/api/vendor/station-code', undefined, auth(vendorToken));
    assert.match(data.code, /^\d{6}$/);
    assert.equal(data.code, currentStationCode('test-secret', vendorId, 30, clock).code);
    const r = await call('POST', '/api/me/scans/station', { code: data.code }, auth(lan));
    assert.equal(r.status, 201);
    assert.equal(r.data.scan.tier, 2);
    assert.equal(r.data.vendor.name, 'Campus Café');
    const wrong = data.code === '000000' ? '111111' : '000000';
    for (let i = 0; i < 10; i++) {
      assert.equal((await call('POST', '/api/me/scans/station', { code: wrong }, auth(lan))).data.error, 'station_code_invalid');
    }
    assert.equal((await call('POST', '/api/me/scans/station', { code: wrong }, auth(lan))).data.error, 'too_many_attempts');
  });

  test('self-scan is unverified, rate-limited and needs your own cup', async () => {
    const u = await call('POST', '/api/users', { consentParticipate: true });
    const token = u.data.token;
    await call('POST', '/api/me/cups', { code: qrCups[1].code }, auth(token));
    const r = await call('POST', '/api/me/scans/self', { code: qrCups[1].url }, auth(token));
    assert.equal(r.status, 201);
    assert.equal(r.data.scan.verified, 0);
    assert.equal(r.data.scan.points, 2);
    assert.equal((await call('POST', '/api/me/scans/self', { code: qrCups[1].code }, auth(token))).data.error, 'cooldown');
    // …but it never blocks the verified counter scan of the same drink.
    const counter = await call('POST', '/api/vendor/scans', { method: 'qr', source: 'camera', value: qrCups[1].code }, auth(vendorToken));
    assert.equal(counter.data.status, 'ok');
    assert.equal((await call('POST', '/api/me/scans/self', { code: qrCups[0].code }, auth(token))).data.error, 'cup_not_yours');
    assert.deepEqual((await call('POST', '/api/me/scans/self', { code: qrCups[2].code }, auth(token))).data, { error: 'cup_unlinked', code: qrCups[2].code });
  });

  test('rewards: points buy a voucher that the counter accepts once', async () => {
    const before = await call('GET', '/api/me/rewards', undefined, auth(lan));
    assert.equal(before.data.balance, 30); // counter QR + counter NFC + station
    assert.equal(before.data.items[0].affordable, true);
    const r = await call('POST', '/api/me/redemptions', { rewardId }, auth(lan));
    assert.equal(r.status, 201);
    assert.match(r.data.voucher.displayCode, /^V-[A-Z0-9]{6}$/);
    assert.equal(r.data.balance, 10);
    assert.equal((await call('POST', '/api/me/redemptions', { rewardId }, auth(lan))).data.error, 'not_enough_points');
    const ok = await call('POST', '/api/vendor/scans', { method: 'qr', source: 'camera', value: r.data.voucher.url }, auth(vendorToken));
    assert.equal(ok.data.status, 'voucher_ok');
    assert.equal(ok.data.reward.titleEn, 'Free upsize');
    const again = await call('POST', '/api/vendor/scans', { method: 'qr', source: 'manual', value: r.data.voucher.displayCode }, auth(vendorToken));
    assert.equal(again.data.status, 'voucher_used');
  });

  test('league: the week’s group ranks participants by verified cups', async () => {
    const r = await call('GET', '/api/me/league', undefined, auth(lan));
    assert.equal(r.status, 200);
    assert.equal(r.data.tier, 0);
    assert.equal(r.data.promote, 5);
    assert.equal(r.data.daysLeft, 4); // Thursday → Thu, Fri, Sat, Sun
    const me = r.data.members.find((m: any) => m.me);
    assert.equal(me.rank, 1);
    assert.equal(me.name, 'Lan N');
    assert.equal(me.initials, 'LN');
    assert.equal(me.cups, 3);
    const home = await call('GET', '/api/me', undefined, auth(lan));
    assert.deepEqual(home.data.league, { tier: 0, topTier: false, rank: 1, cups: 3, daysLeft: 4, promote: 5 });
  });

  test('vendor today: the drinks total turns scans into a reuse share', async () => {
    assert.equal((await call('PUT', '/api/vendor/days/2020-01-01', { drinksTotal: 10 }, auth(vendorToken))).data.error, 'bad_date');
    const r = await call('PUT', '/api/vendor/days/2026-10-01', { drinksTotal: 10 }, auth(vendorToken));
    assert.equal(r.status, 200);
    const t = await call('GET', '/api/vendor/today', undefined, auth(vendorToken));
    assert.equal(t.data.scansToday, 5); // QR, unlinked NFC, NFC, station, second student's QR
    assert.equal(t.data.drinksTotal, 10);
    assert.equal(t.data.share, 0.5);
    assert.equal(t.data.savedVnd, 5 * 3000);
    assert.deepEqual(t.data.byHour, [{ hour: 10, n: 5 }]);
    assert.match(t.data.recent[0].displayCode, /^OCC-/);
  });

  test('console overview and exports respect consent', async () => {
    const o = await call('GET', '/api/admin/overview', undefined, admin);
    assert.equal(o.data.week, 1);
    assert.equal(o.data.kpis.verifiedScans, 5);
    assert.equal(o.data.kpis.reuseShare, 0.5);
    assert.equal(o.data.clusters[0].cluster, 'A');
    assert.equal(o.data.vendors[0].staffShare, 0.8);
    assert.deepEqual(o.data.quality, { l1: 4, l2: 1, l3: 1, flagsThisWeek: 2, unlinkedScans: 1 }); // counter + self-scan duplicates

    const p = await call('GET', '/api/admin/participants', undefined, admin);
    assert.equal(p.data.list[0].nickname, undefined);
    assert.match(p.data.list[0].participant, /^[0-9a-f]{12}$/);

    const csv = (await call('GET', '/api/admin/export/scans.csv', undefined, admin)).data as string;
    const lines = csv.trim().split('\n');
    assert.equal(lines[0].split(',')[3], 'participant');
    assert.equal(lines.length - 1, 3, 'only Lan consented to research');
    assert.ok(!csv.includes('Lan'));

    const open = (await call('GET', '/api/admin/export/open-data.csv', undefined, admin)).data as string;
    const openRows = open.trim().split('\n').slice(1);
    assert.equal(openRows.length, 1);
    assert.equal(openRows[0].split(',')[4], '3');
    assert.notEqual(openRows[0].split(',')[0], lines[1].split(',')[3], 'open data uses different pseudonyms');

    const days = (await call('GET', '/api/admin/export/vendor-days.csv', undefined, admin)).data as string;
    assert.match(days, /2026-10-01,1,Campus Café,A,1,10,,5/);
  });

  test('settings are validated', async () => {
    assert.equal((await call('PUT', '/api/admin/settings', { pilotStart: '2026-13-01' }, admin)).data.error, 'bad_date');
    const r = await call('PUT', '/api/admin/settings', { clusterStarts: { A: 1, B: 4 } }, admin);
    assert.deepEqual(r.data.clusterStarts, { A: 1, B: 4 });
  });

  test('daily goal and streak follow local days; weekends never break the streak', async () => {
    const u = await call('POST', '/api/users', { consentParticipate: true });
    const token = u.data.token;
    await call('POST', '/api/me/cups', { code: qrCups[3].code }, auth(token));
    const counter = () => call('POST', '/api/vendor/scans', { method: 'qr', source: 'camera', value: qrCups[3].code }, auth(vendorToken));

    goLocal('2026-10-02T09:00'); // Friday
    for (let i = 0; i < 3; i++) {
      assert.equal((await counter()).data.status, 'ok');
      tick(5);
    }
    let me = (await call('GET', '/api/me', undefined, auth(token))).data;
    assert.deepEqual([me.goal.today, me.goal.daily, me.goal.streak], [3, 3, 1]);
    assert.deepEqual(me.goal.week.map((d: any) => d.status), ['open', 'open', 'open', 'open', 'done', 'open', 'open']);

    goLocal('2026-10-05T09:00'); // Monday, after an empty weekend
    await counter();
    me = (await call('GET', '/api/me', undefined, auth(token))).data;
    assert.deepEqual([me.goal.today, me.goal.streak], [1, 1]);
    assert.deepEqual(me.goal.week.map((d: any) => d.status), ['today', 'open', 'open', 'open', 'open', 'open', 'open']);

    goLocal('2026-10-07T09:00'); // Wednesday: Monday and Tuesday missed the goal
    me = (await call('GET', '/api/me', undefined, auth(token))).data;
    assert.equal(me.goal.streak, 0);
  });

  test('participant can export and delete their data', async () => {
    const exp = await call('GET', '/api/me/export', undefined, auth(lan));
    assert.equal(exp.data.profile.nickname, 'Lan Nguyễn');
    assert.equal(exp.data.profile.token, undefined);
    assert.equal(exp.data.profile.arm, undefined);
    assert.equal(exp.data.redemptions.length, 1);
    assert.equal((await call('DELETE', '/api/me', undefined, auth(lan))).status, 204);
    assert.equal((await call('GET', '/api/me', undefined, auth(lan))).status, 401);
    assert.equal((await call('GET', `/api/cups/${qrCups[0].code}`)).data.linked, false);
  });
});

describe('Study mode on', () => {
  let api: Awaited<ReturnType<typeof start>>;
  before(async () => {
    api = await start({ studyMode: 'on' });
  });
  after(() => api.server.close());

  test('each arm sees only its features', async () => {
    const seen = [];
    for (let i = 0; i < 4; i++) {
      const r = await api.call('POST', '/api/users', { consentParticipate: true, faculty: 'eng' });
      const f = r.data.features;
      seen.push([f.impactFeedback, f.gamification, f.rewards].filter(Boolean).length);
      const league = await api.call('GET', '/api/me/league', undefined, auth(r.data.token));
      const rewards = await api.call('GET', '/api/me/rewards', undefined, auth(r.data.token));
      assert.equal(league.status, f.gamification ? 200 : 403);
      assert.equal(rewards.status, f.rewards ? 200 : 403);
      assert.equal(r.data.goal === null, !f.gamification);
      assert.equal(r.data.impact === null, !f.impactFeedback);
    }
    assert.deepEqual(seen.sort(), [0, 1, 2, 3], 'one participant per arm');
  });
});

describe('Readers that only report part of the UID', () => {
  let api: Awaited<ReturnType<typeof start>>;
  before(async () => {
    api = await start();
  });
  after(() => api.server.close());

  test('a sticker registered by the USB reader (4 bytes) matches the phone’s full UID (7 bytes), and back', async () => {
    const v = await api.call('POST', '/api/admin/vendors', { name: 'Kiosk', pin: '5555' }, admin);
    const vendor = (await api.call('POST', '/api/vendor/login', { pin: '5555' })).data.token;
    // Serial 5A:C4:7F:21:05:41:89 → the reader sends 5AC47F21
    const reg = await api.call('POST', '/api/vendor/tags', { uid: '5AC47F21' }, auth(vendor));
    const u = await api.call('POST', '/api/users', { consentParticipate: true });
    const linked = await api.call('POST', '/api/me/cups', { nfcUid: '5A:C4:7F:21:05:41:89' }, auth(u.data.token));
    assert.equal(linked.data.cup.code, reg.data.cup.code, 'the phone tap finds the reader-registered sticker');
    const tap = await api.call('POST', '/api/vendor/scans', { method: 'nfc', source: 'usb-hid', value: '5AC47F21' }, auth(vendor));
    assert.equal(tap.data.status, 'ok');

    // The other way round: first tapped on a phone, then scanned by the USB reader.
    const u2 = await api.call('POST', '/api/users', { consentParticipate: true });
    await api.call('POST', '/api/me/cups', { nfcUid: '5AE47F2105AABB' }, auth(u2.data.token));
    const tap2 = await api.call('POST', '/api/vendor/scans', { method: 'nfc', source: 'usb-hid', value: '5AE47F21' }, auth(vendor));
    assert.equal(tap2.data.status, 'ok');
    assert.ok(v.status === 201);
  });
});
