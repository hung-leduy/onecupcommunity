import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { after, before, describe, test } from 'node:test';
import { createApp } from '../src/app.ts';
import { loadConfig } from '../src/config.ts';
import { openDb } from '../src/db.ts';
import { currentStationCode } from '../src/domain.ts';

const config = loadConfig({ dbPath: ':memory:', adminKey: 'test-admin', stationSecret: 'test-secret', publicUrl: 'https://cup.test' });
let base = '';
let server: ReturnType<ReturnType<typeof createApp>['listen']>;

async function call(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data: any = text;
  try { data = JSON.parse(text); } catch {}
  return { status: res.status, data };
}
const admin = { 'x-admin-key': 'test-admin' };
const auth = (token: string) => ({ authorization: `Bearer ${token}` });

before(async () => {
  server = createApp(openDb(':memory:'), config).listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => server.close());

describe('One-Cup API', () => {
  let vendorToken = '';
  let vendorId = '';
  let student = '';
  let qrCup: any;

  test('admin creates a vendor and QR cups', async () => {
    assert.equal((await call('GET', '/api/admin/stats')).status, 401);
    const v = await call('POST', '/api/admin/vendors', { name: 'Canteen', pin: '1234', discountVnd: 2000 }, admin);
    assert.equal(v.status, 201);
    const cups = await call('POST', '/api/admin/cups', { count: 3 }, admin);
    assert.equal(cups.data.length, 3);
    qrCup = cups.data[0];
    assert.match(qrCup.url, /^https:\/\/cup\.test\/c\/[A-Z0-9]{8}$/);
  });

  test('vendor logs in with PIN', async () => {
    assert.equal((await call('POST', '/api/vendor/login', { pin: '0000' })).status, 401);
    const r = await call('POST', '/api/vendor/login', { pin: '1234' });
    vendorToken = r.data.token;
    vendorId = r.data.vendor.id;
    assert.equal(r.data.vendor.discountVnd, 2000);
  });

  test('student must consent to register', async () => {
    assert.equal((await call('POST', '/api/users', { nickname: 'A' })).status, 400);
    const r = await call('POST', '/api/users', { nickname: 'Lan', consentParticipate: true, consentResearch: true });
    assert.equal(r.status, 201);
    student = r.data.token;
    assert.deepEqual(r.data.features, { impactFeedback: true, badges: true, rewards: true }); // study mode off
  });

  test('student links a QR cup by scanning its URL', async () => {
    const r = await call('POST', '/api/me/cups', { code: qrCup.url }, auth(student));
    assert.equal(r.status, 201);
    assert.equal(r.data.cups[0].code, qrCup.code);
    const other = await call('POST', '/api/users', { consentParticipate: true });
    assert.equal((await call('POST', '/api/me/cups', { code: qrCup.code }, auth(other.data.token))).status, 409);
  });

  test('counter QR scan is verified, gives discount, and is de-duplicated', async () => {
    const r = await call('POST', '/api/vendor/scans', { method: 'qr', source: 'camera', value: qrCup.url, txDurationMs: 4200 }, auth(vendorToken));
    assert.equal(r.data.status, 'ok');
    assert.equal(r.data.discountVnd, 2000);
    assert.equal(r.data.user.nickname, 'Lan');
    assert.equal(r.data.scan.verified, 1);
    const again = await call('POST', '/api/vendor/scans', { method: 'qr', source: 'camera', value: qrCup.code }, auth(vendorToken));
    assert.equal(again.data.status, 'duplicate');
  });

  test('unknown NFC tag → register at the counter → student claims it', async () => {
    const uid = '04:A2:3B:4C:5D:6E:7F';
    const unknown = await call('POST', '/api/vendor/scans', { method: 'nfc', source: 'usb-hid', value: uid }, auth(vendorToken));
    assert.deepEqual(unknown.data, { status: 'unknown', method: 'nfc', uid: '04A23B4C5D6E7F' });

    const reg = await call('POST', '/api/vendor/tags', { uid: '04a23b4c5d6e7f' }, auth(vendorToken));
    assert.equal(reg.status, 201);
    const unlinked = await call('POST', '/api/vendor/scans', { method: 'nfc', source: 'pcsc-bridge', value: uid }, auth(vendorToken));
    assert.equal(unlinked.data.status, 'unlinked');
    assert.equal(unlinked.data.discountVnd, 0);

    await call('POST', '/api/me/cups', { code: reg.data.cup.code }, auth(student));
    const me = await call('GET', '/api/me', undefined, auth(student));
    assert.equal(me.data.cups.length, 2);
    assert.equal(me.data.uses.total, 1); // only the QR scan; the earlier unlinked NFC scan is not attributed
  });

  test('bad NFC UID is rejected', async () => {
    const r = await call('POST', '/api/vendor/scans', { method: 'nfc', source: 'usb-hid', value: 'hello' }, auth(vendorToken));
    assert.equal(r.status, 400);
  });

  test('station code scan (tier 2) needs a fresh code', async () => {
    const me = await call('GET', '/api/me', undefined, auth(student));
    const nfcCup = me.data.cups.find((c: any) => c.kind === 'nfc');
    const bad = await call('POST', '/api/me/scans/station', { vendorId, code: 'ZZZZZZ', cupId: nfcCup.id }, auth(student));
    assert.equal(bad.status, 400);
    const { code } = (await call('GET', '/api/vendor/station-code', undefined, auth(vendorToken))).data;
    assert.equal(code, currentStationCode('test-secret', vendorId, config.stationCodeTtlSec).code);
    // The NFC cup was scanned (unlinked) at the counter a moment ago → cooldown applies.
    const dup = await call('POST', '/api/me/scans/station', { vendorId, code, cupId: nfcCup.id }, auth(student));
    assert.equal(dup.status, 429);
  });

  test('self-scan (tier 3) is unverified and rate-limited', async () => {
    const fresh = await call('POST', '/api/users', { consentParticipate: true }, {});
    const cups = await call('POST', '/api/admin/cups', { count: 1 }, admin);
    await call('POST', '/api/me/cups', { code: cups.data[0].code }, auth(fresh.data.token));
    const cupId = (await call('GET', '/api/me', undefined, auth(fresh.data.token))).data.cups[0].id;
    const r = await call('POST', '/api/me/scans/self', { cupId }, auth(fresh.data.token));
    assert.equal(r.status, 201);
    assert.equal(r.data.scan.verified, 0);
    assert.equal((await call('POST', '/api/me/scans/self', { cupId }, auth(fresh.data.token))).status, 429);
    // …but it does not block the verified counter scan of the same drink.
    const counter = await call('POST', '/api/vendor/scans', { method: 'qr', source: 'manual', value: cups.data[0].code }, auth(vendorToken));
    assert.equal(counter.data.status, 'ok');
  });

  test('stats and research export respect consent', async () => {
    const stats = await call('GET', '/api/admin/stats', undefined, admin);
    assert.ok(stats.data.totals.verified_scans >= 3);
    assert.ok(stats.data.counterByMethod.some((m: any) => m.method === 'qr' && m.avg_tx_ms === 4200));
    const csv = await call('GET', '/api/admin/export.csv', undefined, admin);
    const lines = csv.data.trim().split('\n');
    assert.equal(lines[0].split(',')[0], 'created_at');
    assert.equal(lines.length - 1, 1); // only Lan consented to research, and only her attributed scan
    assert.ok(!csv.data.includes('Lan'));
  });

  test('student can export and delete their data', async () => {
    const exp = await call('GET', '/api/me/export', undefined, auth(student));
    assert.equal(exp.data.profile.nickname, 'Lan');
    assert.equal(exp.data.profile.token, undefined);
    assert.equal((await call('DELETE', '/api/me', undefined, auth(student))).status, 204);
    assert.equal((await call('GET', '/api/me', undefined, auth(student))).status, 401);
    const cup = await call('GET', `/api/cups/${qrCup.code}`);
    assert.equal(cup.data.linked, false);
  });
});
