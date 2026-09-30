import { cupUrl, displayCode, newCode, newId } from '../domain.ts';
import { HttpError, type Ctx, type Row } from '../http.ts';

export type Tier = 1 | 2 | 3;

export const publicCup = (ctx: Ctx, cup: Row) => ({
  id: cup.id,
  kind: cup.kind,
  code: cup.code,
  displayCode: displayCode(cup.code),
  nfcUid: cup.nfc_uid,
  url: cupUrl(ctx.config.publicUrl, cup.code),
  linked: !!cup.user_id,
  linkedAt: cup.linked_at,
  createdAt: cup.created_at,
});

export function createCup(ctx: Ctx, kind: 'qr' | 'nfc', nfcUid: string | null = null): Row {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = newCode(6);
    if (ctx.get('SELECT 1 FROM cups WHERE code = ?', code)) continue;
    const cup = { id: newId(), kind, code, nfc_uid: nfcUid, user_id: null, linked_at: null, created_at: ctx.nowIso() };
    ctx.run('INSERT INTO cups (id, kind, code, nfc_uid, user_id, linked_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', ...Object.values(cup));
    return cup;
  }
  throw new HttpError(500, 'server_error');
}

/**
 * Is there already a counted scan of this cup inside the tier's cooldown window?
 * A self-scan is blocked by any recent scan; verified scans only by other verified scans,
 * so an earlier unverified self-scan never prevents the counter from recording the real use.
 */
export function isDuplicate(ctx: Ctx, cupId: string, tier: Tier): boolean {
  const { counter, station, self } = ctx.config.cooldownMin;
  const minutes = tier === 1 ? counter : tier === 2 ? station : self;
  const tiers = tier === 3 ? '1,2,3' : '1,2';
  const since = new Date(ctx.now().getTime() - minutes * 60_000).toISOString();
  return !!ctx.get(`SELECT 1 FROM scans WHERE cup_id = ? AND created_at > ? AND tier IN (${tiers}) LIMIT 1`, cupId, since);
}

/** Record a rejected duplicate so the console can show how often it happens. */
export function flagDuplicate(ctx: Ctx, cup: Row, tier: Tier, vendorId: string | null = null) {
  ctx.run(
    'INSERT INTO scan_flags (id, cup_id, user_id, vendor_id, tier, reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    newId(),
    cup.id,
    cup.user_id ?? null,
    vendorId,
    tier,
    'cooldown',
    ctx.nowIso(),
  );
}

export function insertScan(
  ctx: Ctx,
  s: { cup: Row; tier: Tier; method: 'qr' | 'nfc'; source: string; vendorId?: string | null; txDurationMs?: number | null; discountVnd?: number },
): Row {
  const linked = !!s.cup.user_id;
  const row = {
    id: newId(),
    cup_id: s.cup.id,
    user_id: s.cup.user_id ?? null,
    vendor_id: s.vendorId ?? null,
    tier: s.tier,
    verified: s.tier === 3 ? 0 : 1,
    method: s.method,
    source: s.source,
    tx_duration_ms: s.txDurationMs ?? null,
    discount_vnd: linked ? (s.discountVnd ?? 0) : 0,
    points: linked ? (s.tier === 3 ? ctx.config.points.self : ctx.config.points.verified) : 0,
    created_at: ctx.nowIso(),
  };
  ctx.run(
    `INSERT INTO scans (id, cup_id, user_id, vendor_id, tier, verified, method, source, tx_duration_ms, discount_vnd, points, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ...Object.values(row),
  );
  return row;
}
