import { createHmac, randomBytes, randomInt } from 'node:crypto';

// Crockford-like alphabet without 0/O/1/I/L so codes can be read aloud and typed by hand.
// Because it has no "O", a code can never start with the "OCC" display prefix.
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export function newId(): string {
  return randomBytes(9).toString('base64url');
}

export function newToken(): string {
  return randomBytes(24).toString('base64url');
}

export function newCode(length = 6): string {
  let out = '';
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return out;
}

/** How a cup code is printed on cups and shown in the apps: "OCC-4K2P9X". */
export const displayCode = (code: string) => `OCC-${code}`;

/**
 * Normalise an NFC UID to upper-case hex without separators.
 * Accepts "04:A2:3B:..", "04-a2-3b", "04a23b..". NFC-A UIDs are 4, 7 or 10 bytes.
 */
export function normalizeUid(raw: string): string | null {
  const hex = raw.trim().replace(/[\s:\-]/g, '').toUpperCase();
  if (!/^[0-9A-F]+$/.test(hex)) return null;
  if (![8, 14, 20].includes(hex.length)) return null;
  return hex;
}

/** Extract a cup code from a scanned QR payload: "<publicUrl>/c/CODE", "OCC-CODE" or the bare code. */
export function parseCupCode(raw: string): string | null {
  const value = raw.trim();
  const fromUrl = value.match(/\/c\/([A-Za-z0-9-]{4,20})(?:[/?#]|$)/);
  const code = (fromUrl ? fromUrl[1] : value).toUpperCase().replace(/^OCC-?/, '');
  return /^[A-Z0-9]{4,16}$/.test(code) ? code : null;
}

/** Voucher payloads: "<publicUrl>/v/CODE" (QR on the student's phone) or "V-CODE" typed by staff. */
export function parseVoucher(raw: string): string | null {
  const value = raw.trim();
  const m = value.match(/\/v\/([A-Za-z0-9]{6})(?:[/?#]|$)/) ?? value.match(/^V-([A-Za-z0-9]{6})$/i);
  return m ? m[1].toUpperCase() : null;
}

export const cupUrl = (publicUrl: string, code: string) => `${publicUrl}/c/${code}`;
export const voucherUrl = (publicUrl: string, code: string) => `${publicUrl}/v/${code}`;

// ---- Tier 2: rotating 6-digit station codes (TOTP-style) ------------------------------------

function stationCodeFor(secret: string, vendorId: string, window: number): string {
  const digest = createHmac('sha256', secret).update(`${vendorId}:${window}`).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const bin = ((digest[offset] & 0x7f) << 24) | (digest[offset + 1] << 16) | (digest[offset + 2] << 8) | digest[offset + 3];
  return String(bin % 1_000_000).padStart(6, '0');
}

export function currentStationCode(secret: string, vendorId: string, ttlSec: number, nowMs = Date.now()) {
  const window = Math.floor(nowMs / 1000 / ttlSec);
  const expiresAt = (window + 1) * ttlSec * 1000;
  return { code: stationCodeFor(secret, vendorId, window), expiresAt };
}

/** Accept the current and the previous window, so a code scanned right before rotation still works. */
export function verifyStationCode(secret: string, vendorId: string, ttlSec: number, code: string, nowMs = Date.now()): boolean {
  const window = Math.floor(nowMs / 1000 / ttlSec);
  const wanted = code.replace(/\s/g, '');
  return [window, window - 1].some((w) => stationCodeFor(secret, vendorId, w) === wanted);
}

// ---- Experimental arms (H2) ------------------------------------------------------------------
// Cumulative, as in the research design: A control · B + feedback · C + gamification · D + rewards.

export const ARMS = ['control', 'feedback', 'gamification', 'rewards'] as const;
export type Arm = (typeof ARMS)[number];
export const ARM_LETTER: Record<Arm, string> = { control: 'A', feedback: 'B', gamification: 'C', rewards: 'D' };

export type Features = { impactFeedback: boolean; gamification: boolean; rewards: boolean };

/**
 * Which features a participant sees. With STUDY_MODE=off (demo) and after the study ends,
 * everyone gets everything — the ethics plan opens all features to all users after the study.
 */
export function featuresFor(arm: string, opts: { studyMode: 'on' | 'off'; studyEnded: boolean }): Features {
  if (opts.studyMode === 'off' || opts.studyEnded) return { impactFeedback: true, gamification: true, rewards: true };
  const rank = ARMS.indexOf(arm as Arm);
  return { impactFeedback: rank >= 1, gamification: rank >= 2, rewards: rank >= 3 };
}

/** Pick uniformly among the arms with the fewest members in the stratum — permuted blocks of 4. */
export function pickArm(countsInStratum: Partial<Record<string, number>>): Arm {
  const min = Math.min(...ARMS.map((a) => countsInStratum[a] ?? 0));
  const candidates = ARMS.filter((a) => (countsInStratum[a] ?? 0) === min);
  return candidates[randomInt(candidates.length)];
}

// ---- Impact, milestones, names ---------------------------------------------------------------

export function impactOf(uses: number, coeff: { plasticGramsPerCup: number; co2eGramsPerCup: number }) {
  return {
    cupsAvoided: uses,
    plasticGrams: Math.round(uses * coeff.plasticGramsPerCup * 10) / 10,
    co2eGrams: Math.round(uses * coeff.co2eGramsPerCup),
  };
}

export const MILESTONES = [10, 25, 50, 100, 250, 500];

export function milestonesFor(uses: number) {
  const next = MILESTONES.find((m) => uses < m) ?? null;
  return { next, list: MILESTONES.map((target) => ({ target, reached: uses >= target, current: target === next })) };
}

const stripMarks = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');

/** "Minh Anh Lê" → "Minh Anh L" — enough to recognise a friend on the leaderboard. */
export function shortName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return words[0] ?? '';
  return `${words.slice(0, -1).join(' ')} ${words[words.length - 1][0]}`;
}

/** "Đức Bảo Trần" → "DB". */
export function initials(name: string): string {
  const words = stripMarks(name).trim().split(/\s+/).filter(Boolean);
  return (words.length >= 2 ? words[0][0] + words[1][0] : (words[0] ?? '?').slice(0, 2)).toUpperCase();
}
