import { createHmac, randomBytes, randomInt } from 'node:crypto';

// Crockford-like alphabet without 0/O/1/I/L so codes can be read aloud and typed by hand.
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export function newId(): string {
  return randomBytes(9).toString('base64url');
}

export function newToken(): string {
  return randomBytes(24).toString('base64url');
}

export function newCupCode(length = 8): string {
  let out = '';
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return out;
}

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

/** Extract a cup code from a scanned QR payload: either "<publicUrl>/c/CODE" or the bare code. */
export function parseCupCode(raw: string): string | null {
  const value = raw.trim();
  const fromUrl = value.match(/\/c\/([A-Za-z0-9]{4,16})(?:[/?#]|$)/);
  const code = (fromUrl ? fromUrl[1] : value).toUpperCase();
  return /^[A-Z0-9]{4,16}$/.test(code) ? code : null;
}

export function cupUrl(publicUrl: string, code: string): string {
  return `${publicUrl}/c/${code}`;
}

// ---- Tier 2: rotating station codes ------------------------------------------------------

function stationCodeFor(secret: string, vendorId: string, window: number): string {
  const digest = createHmac('sha256', secret).update(`${vendorId}:${window}`).digest();
  let out = '';
  for (let i = 0; i < 6; i++) out += CODE_ALPHABET[digest[i] % CODE_ALPHABET.length];
  return out;
}

export function currentStationCode(secret: string, vendorId: string, ttlSec: number, nowMs = Date.now()) {
  const window = Math.floor(nowMs / 1000 / ttlSec);
  const expiresAt = (window + 1) * ttlSec * 1000;
  return { code: stationCodeFor(secret, vendorId, window), expiresAt };
}

/** Accept the current and the previous window, so a code scanned right before rotation still works. */
export function verifyStationCode(secret: string, vendorId: string, ttlSec: number, code: string, nowMs = Date.now()): boolean {
  const window = Math.floor(nowMs / 1000 / ttlSec);
  const wanted = code.trim().toUpperCase();
  return [window, window - 1].some((w) => stationCodeFor(secret, vendorId, w) === wanted);
}

// ---- Experimental arms (H2) --------------------------------------------------------------

export const ARMS = ['control', 'feedback', 'feedback_gamification', 'gamification_rewards'] as const;
export type Arm = (typeof ARMS)[number];

export function randomArm(): Arm {
  return ARMS[randomInt(ARMS.length)];
}

export type Features = { impactFeedback: boolean; badges: boolean; rewards: boolean };

export function featuresFor(arm: string, studyMode: 'on' | 'off'): Features {
  if (studyMode === 'off') return { impactFeedback: true, badges: true, rewards: true };
  return {
    impactFeedback: arm === 'feedback' || arm === 'feedback_gamification',
    badges: arm === 'feedback_gamification' || arm === 'gamification_rewards',
    rewards: arm === 'gamification_rewards',
  };
}

// ---- Impact and badges ------------------------------------------------------------------

export function impactOf(uses: number, coeff: { plasticGramsPerCup: number; co2eGramsPerCup: number }) {
  return {
    cupsAvoided: uses,
    plasticGrams: uses * coeff.plasticGramsPerCup,
    co2eGrams: uses * coeff.co2eGramsPerCup,
  };
}

const BADGES = [
  { id: 'first_use', label: 'Lần đầu tái sử dụng', threshold: 1 },
  { id: 'uses_5', label: '5 lần tái sử dụng', threshold: 5 },
  { id: 'uses_10', label: '10 lần tái sử dụng', threshold: 10 },
  { id: 'uses_25', label: '25 lần tái sử dụng', threshold: 25 },
  { id: 'uses_50', label: '50 lần tái sử dụng', threshold: 50 },
];

export function badgesFor(uses: number) {
  return BADGES.map((b) => ({ ...b, earned: uses >= b.threshold }));
}
