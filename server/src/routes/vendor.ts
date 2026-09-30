import type { Express, Request } from 'express';
import { normalizeUid, parseCupCode, parseVoucher, currentStationCode, displayCode } from '../domain.ts';
import { bearer, HttpError, type Ctx, type Row } from '../http.ts';
import { createCup, flagDuplicate, insertScan, isDuplicate, publicCup, findCupByUid } from '../services/scans.ts';
import { studyClock } from '../services/settings.ts';
import { vendorToday } from '../services/stats.ts';
import { addDays, isDay, localDay } from '../time.ts';

const SOURCES = ['camera', 'webnfc', 'usb-hid', 'pcsc-bridge', 'manual'] as const;

export const publicVendor = (v: Row) => ({
  id: v.id,
  name: v.name,
  discountVnd: v.discount_vnd,
  stationLabel: v.station_label,
  cluster: v.cluster,
});

export function vendorRoutes(app: Express, ctx: Ctx) {
  const { get, run } = ctx;

  function requireVendor(req: Request): Row {
    const token = bearer(req);
    const vendor = token ? get('SELECT * FROM vendors WHERE token = ?', token) : undefined;
    if (!vendor) throw new HttpError(401, 'unauthorized');
    return vendor;
  }

  app.post('/api/vendor/login', (req, res) => {
    const vendor = get('SELECT * FROM vendors WHERE pin = ?', String(req.body?.pin ?? ''));
    if (!vendor) throw new HttpError(401, 'bad_pin');
    res.json({ token: vendor.token, vendor: publicVendor(vendor) });
  });

  app.get('/api/vendor/me', (req, res) => {
    res.json(publicVendor(requireVendor(req)));
  });

  /** A voucher shown by a student (QR on their phone, or "V-XXXXXX" typed by staff). */
  function redeemVoucher(vendor: Row, voucher: string) {
    const r = get(
      `SELECT d.*, w.title_vi, w.title_en, w.vendor_id AS reward_vendor, v.name AS reward_vendor_name
       FROM redemptions d JOIN rewards w ON w.id = d.reward_id LEFT JOIN vendors v ON v.id = w.vendor_id WHERE d.voucher = ?`,
      voucher,
    );
    if (!r) return { status: 'voucher_invalid', voucher: `V-${voucher}` };
    const reward = { titleVi: r.title_vi, titleEn: r.title_en, vendor: r.reward_vendor_name };
    if (r.status === 'used') return { status: 'voucher_used', voucher: `V-${voucher}`, reward, usedAt: r.used_at };
    if (r.reward_vendor && r.reward_vendor !== vendor.id) return { status: 'voucher_wrong_vendor', voucher: `V-${voucher}`, reward };
    run(`UPDATE redemptions SET status = 'used', used_vendor_id = ?, used_at = ? WHERE id = ?`, vendor.id, ctx.nowIso(), r.id);
    return { status: 'voucher_ok', voucher: `V-${voucher}`, reward };
  }

  // Tier 1: staff scans the cup at the counter (camera QR, Web NFC, USB reader or PC/SC bridge).
  app.post('/api/vendor/scans', (req, res) => {
    const vendor = requireVendor(req);
    const { method, source, value, txDurationMs } = req.body ?? {};
    if (method !== 'qr' && method !== 'nfc') throw new HttpError(400, 'bad_request', { field: 'method' });
    if (!SOURCES.includes(source)) throw new HttpError(400, 'bad_request', { field: 'source' });

    let cup: Row | undefined;
    if (method === 'nfc') {
      const uid = normalizeUid(String(value ?? ''));
      if (!uid) throw new HttpError(400, 'bad_uid', { value: String(value ?? '') });
      cup = findCupByUid(ctx, uid);
      if (!cup) return res.json({ status: 'unknown', method, uid });
    } else {
      const voucher = parseVoucher(String(value ?? ''));
      if (voucher) return res.json(redeemVoucher(vendor, voucher));
      const code = parseCupCode(String(value ?? ''));
      cup = code ? get('SELECT * FROM cups WHERE code = ?', code) : undefined;
      if (!cup) return res.json({ status: 'unknown', method, value });
    }

    if (isDuplicate(ctx, cup.id, 1)) {
      flagDuplicate(ctx, cup, 1, vendor.id);
      return res.json({ status: 'duplicate', cup: publicCup(ctx, cup) });
    }

    const duration = Number.isFinite(txDurationMs) && txDurationMs > 0 && txDurationMs < 600_000 ? Math.round(txDurationMs) : null;
    const scan = insertScan(ctx, { cup, tier: 1, method, source, vendorId: vendor.id, txDurationMs: duration, discountVnd: vendor.discount_vnd });
    res.json({
      status: cup.user_id ? 'ok' : 'unlinked',
      scan,
      cup: publicCup(ctx, cup),
      discountVnd: scan.discount_vnd,
      points: scan.points,
    });
  });

  // Register a fresh NFC sticker (e.g. an on-metal tag put on a student's own bottle).
  app.post('/api/vendor/tags', (req, res) => {
    requireVendor(req);
    const uid = normalizeUid(String(req.body?.uid ?? ''));
    if (!uid) throw new HttpError(400, 'bad_uid');
    const existing = findCupByUid(ctx, uid);
    const cup = existing ?? createCup(ctx, 'nfc', uid);
    res.status(existing ? 200 : 201).json({ created: !existing, cup: publicCup(ctx, cup) });
  });

  /** Today's numbers for the counter, and whether its cluster has started the intervention. */
  function todayView(vendor: Row) {
    const today = vendorToday(ctx, vendor.id);
    const clock = studyClock(ctx);
    return {
      ...today,
      intervention: clock.week >= clock.clusterStart(vendor.cluster),
      recent: today.recent.map((r) => ({ ...r, displayCode: displayCode(r.cup_code), linked: !!r.linked })),
    };
  }

  app.get('/api/vendor/today', (req, res) => {
    res.json(todayView(requireVendor(req)));
  });

  // Daily counts from the outlet: all drinks served (and, before the intervention, observed reusable cups).
  app.put('/api/vendor/days/:day', (req, res) => {
    const vendor = requireVendor(req);
    const day = req.params.day;
    const today = localDay(ctx.now(), ctx.config.tzOffsetMin);
    if (!isDay(day) || day > today || day < addDays(today, -7)) throw new HttpError(400, 'bad_date');
    const num = (v: unknown) => (v === null || v === '' || v === undefined ? null : Number.isInteger(Number(v)) && Number(v) >= 0 && Number(v) < 100_000 ? Number(v) : NaN);
    const drinks = num(req.body?.drinksTotal);
    const observed = num(req.body?.reusableObserved);
    if (Number.isNaN(drinks) || Number.isNaN(observed)) throw new HttpError(400, 'bad_request');
    run(
      `INSERT INTO vendor_days (vendor_id, day, drinks_total, reusable_observed, updated_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(vendor_id, day) DO UPDATE SET drinks_total = excluded.drinks_total,
         reusable_observed = COALESCE(excluded.reusable_observed, vendor_days.reusable_observed), updated_at = excluded.updated_at`,
      vendor.id,
      day,
      drinks,
      observed,
      ctx.nowIso(),
    );
    res.json(todayView(vendor));
  });

  app.get('/api/vendor/station-code', (req, res) => {
    const vendor = requireVendor(req);
    const { code, expiresAt } = currentStationCode(ctx.config.stationSecret, vendor.id, ctx.config.stationCodeTtlSec, ctx.now().getTime());
    res.json({ vendorId: vendor.id, code, expiresAt, url: `${ctx.config.publicUrl}/s/${vendor.id}/${code}` });
  });
}
