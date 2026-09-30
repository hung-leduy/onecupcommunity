import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  currentStationCode, displayCode, featuresFor, initials, milestonesFor, normalizeUid, parseCupCode, parseVoucher, pickArm, shortName, verifyStationCode,
} from '../src/domain.ts';
import { addDays, dayStartIso, localDay, mondayOf } from '../src/time.ts';

test('normalizeUid accepts common reader formats', () => {
  assert.equal(normalizeUid('04:a2:3b:4c:5d:6e:7f'), '04A23B4C5D6E7F');
  assert.equal(normalizeUid('DE AD BE EF'), 'DEADBEEF');
  assert.equal(normalizeUid('04-A2'), null);
  assert.equal(normalizeUid('xyz12345'), null);
});

test('parseCupCode reads URLs, OCC- display codes and bare codes', () => {
  assert.equal(parseCupCode('https://cup.test/c/AB23CD'), 'AB23CD');
  assert.equal(parseCupCode('https://cup.test/c/ab23cd?x=1'), 'AB23CD');
  assert.equal(parseCupCode(' occ-4k2p9x '), '4K2P9X');
  assert.equal(parseCupCode('OCC4K2P9X'), '4K2P9X');
  assert.equal(parseCupCode('https://evil.test/whatever'), null);
  assert.equal(displayCode('4K2P9X'), 'OCC-4K2P9X');
});

test('parseVoucher only accepts voucher URLs and V- codes', () => {
  assert.equal(parseVoucher('https://cup.test/v/abc234'), 'ABC234');
  assert.equal(parseVoucher('v-ABC234'), 'ABC234');
  assert.equal(parseVoucher('ABC234'), null);
});

test('station codes are 6 digits, rotate, and accept one previous window', () => {
  const t = 1_800_000_000_000;
  const { code } = currentStationCode('s', 'v1', 30, t);
  assert.match(code, /^\d{6}$/);
  assert.ok(verifyStationCode('s', 'v1', 30, code, t));
  assert.ok(verifyStationCode('s', 'v1', 30, code, t + 30_000));
  assert.ok(!verifyStationCode('s', 'v1', 30, code, t + 61_000));
  assert.ok(!verifyStationCode('s', 'v2', 30, code, t));
});

test('arms are cumulative and open up when the study ends or study mode is off', () => {
  const on = { studyMode: 'on' as const, studyEnded: false };
  assert.deepEqual(featuresFor('control', on), { impactFeedback: false, gamification: false, rewards: false });
  assert.deepEqual(featuresFor('feedback', on), { impactFeedback: true, gamification: false, rewards: false });
  assert.deepEqual(featuresFor('gamification', on), { impactFeedback: true, gamification: true, rewards: false });
  assert.deepEqual(featuresFor('rewards', on), { impactFeedback: true, gamification: true, rewards: true });
  assert.deepEqual(featuresFor('control', { studyMode: 'on', studyEnded: true }), { impactFeedback: true, gamification: true, rewards: true });
  assert.deepEqual(featuresFor('control', { studyMode: 'off', studyEnded: false }), { impactFeedback: true, gamification: true, rewards: true });
});

test('pickArm fills the emptiest arms first (permuted blocks)', () => {
  assert.equal(pickArm({ control: 1, feedback: 1, gamification: 0, rewards: 1 }), 'gamification');
  const counts: Record<string, number> = {};
  for (let i = 0; i < 8; i++) {
    const a = pickArm(counts);
    counts[a] = (counts[a] ?? 0) + 1;
  }
  assert.deepEqual(Object.values(counts), [2, 2, 2, 2]);
});

test('milestones and leaderboard names', () => {
  assert.deepEqual(milestonesFor(47).next, 50);
  assert.deepEqual(milestonesFor(47).list.slice(0, 3).map((m) => m.reached), [true, true, false]);
  assert.equal(milestonesFor(600).next, null);
  assert.equal(shortName('Minh Anh Lê'), 'Minh Anh L');
  assert.equal(initials('Đức Bảo Trần'), 'DB');
  assert.equal(initials('Lan'), 'LA');
});

test('local time helpers use UTC+7', () => {
  assert.equal(localDay('2026-09-30T17:30:00Z', 420), '2026-10-01');
  assert.equal(mondayOf('2026-10-04'), '2026-09-28');
  assert.equal(addDays('2026-02-28', 1), '2026-03-01');
  assert.equal(dayStartIso('2026-10-01', 420), '2026-09-30T17:00:00.000Z');
});
