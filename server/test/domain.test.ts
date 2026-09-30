import assert from 'node:assert/strict';
import { test } from 'node:test';
import { currentStationCode, featuresFor, normalizeUid, parseCupCode, verifyStationCode } from '../src/domain.ts';

test('normalizeUid accepts common reader formats', () => {
  assert.equal(normalizeUid('04:a2:3b:4c:5d:6e:7f'), '04A23B4C5D6E7F');
  assert.equal(normalizeUid('DE AD BE EF'), 'DEADBEEF');
  assert.equal(normalizeUid('04-A2'), null); // too short
  assert.equal(normalizeUid('xyz12345'), null);
});

test('parseCupCode reads URLs and bare codes', () => {
  assert.equal(parseCupCode('https://cup.test/c/AB23CD45'), 'AB23CD45');
  assert.equal(parseCupCode('https://cup.test/c/ab23cd45?x=1'), 'AB23CD45');
  assert.equal(parseCupCode(' ab23cd45 '), 'AB23CD45');
  assert.equal(parseCupCode('https://evil.test/whatever'), null);
});

test('station codes rotate and accept one previous window', () => {
  const t = 1_800_000_000_000;
  const { code } = currentStationCode('s', 'v1', 30, t);
  assert.ok(verifyStationCode('s', 'v1', 30, code, t));
  assert.ok(verifyStationCode('s', 'v1', 30, code, t + 30_000));
  assert.ok(!verifyStationCode('s', 'v1', 30, code, t + 61_000));
  assert.ok(!verifyStationCode('s', 'v2', 30, code, t));
});

test('study mode gates features by arm', () => {
  assert.deepEqual(featuresFor('control', 'on'), { impactFeedback: false, badges: false, rewards: false });
  assert.deepEqual(featuresFor('gamification_rewards', 'on'), { impactFeedback: false, badges: true, rewards: true });
  assert.deepEqual(featuresFor('control', 'off'), { impactFeedback: true, badges: true, rewards: true });
});
