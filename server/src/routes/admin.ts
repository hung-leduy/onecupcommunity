import type { Express, Request, Response } from 'express';
import { ARM_LETTER, newId, newToken } from '../domain.ts';
import { HttpError, type Ctx } from '../http.ts';
import { createCup, publicCup } from '../services/scans.ts';
import { readSettings, studyClock, writeSettings } from '../services/settings.ts';
import { arms, overview, participants, pseudonym, quality } from '../services/stats.ts';
import { localDay, sqlShift } from '../time.ts';
import { publicVendor } from './vendor.ts';

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function sendCsv(res: Response, filename: string, header: string[], rows: unknown[][]) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send([header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n') + '\n');
}

export function adminRoutes(app: Express, ctx: Ctx) {
  const { get, all, run } = ctx;

  const requireAdmin = (req: Request) => {
    if (req.headers['x-admin-key'] !== ctx.config.adminKey) throw new HttpError(401, 'bad_admin_key');
  };
  const guard = (fn: (req: Request, res: Response) => void) => (req: Request, res: Response) => {
    requireAdmin(req);
    fn(req, res);
  };

  // ---- analytics ---------------------------------------------------------------------------

  app.get('/api/admin/overview', guard((req, res) => {
    const weeks = Number(req.query.weeks);
    res.json(overview(ctx, Number.isInteger(weeks) && weeks > 0 ? weeks : undefined));
  }));
  app.get('/api/admin/participants', guard((_req, res) => res.json(participants(ctx))));
  app.get('/api/admin/arms', guard((_req, res) => res.json(arms(ctx))));
  app.get('/api/admin/quality', guard((_req, res) => res.json(quality(ctx))));

  // ---- settings ----------------------------------------------------------------------------

  app.get('/api/admin/settings', guard((_req, res) => res.json(readSettings(ctx))));
  app.put('/api/admin/settings', guard((req, res) => {
    const b = req.body ?? {};
    writeSettings(ctx, {
      pilotStart: b.pilotStart,
      pilotWeeks: b.pilotWeeks === undefined ? undefined : Number(b.pilotWeeks),
      studyEnd: b.studyEnd,
      rewardsEnd: b.rewardsEnd,
      clusterStarts: b.clusterStarts,
    });
    res.json(readSettings(ctx));
  }));

  // ---- vendors -----------------------------------------------------------------------------

  const vendorRow = (v: Record<string, any>) => ({ ...publicVendor(v), pin: v.pin, createdAt: v.created_at });

  app.get('/api/admin/vendors', guard((_req, res) => {
    res.json(all('SELECT * FROM vendors ORDER BY cluster, name').map(vendorRow));
  }));

  function vendorFields(b: any, partial: boolean) {
    const out: Record<string, unknown> = {};
    if (b.name !== undefined || !partial) {
      if (!String(b.name ?? '').trim()) throw new HttpError(400, 'bad_request', { field: 'name' });
      out.name = String(b.name).trim().slice(0, 60);
    }
    if (b.pin !== undefined || !partial) {
      if (!/^\d{4,8}$/.test(String(b.pin ?? ''))) throw new HttpError(400, 'bad_pin_format');
      out.pin = String(b.pin);
    }
    if (b.discountVnd !== undefined) out.discount_vnd = Math.max(0, Math.round(Number(b.discountVnd) || 0));
    if (b.cluster !== undefined) {
      if (!/^[A-Z]$/.test(String(b.cluster))) throw new HttpError(400, 'bad_request', { field: 'cluster' });
      out.cluster = String(b.cluster);
    }
    if (b.stationLabel !== undefined) out.station_label = String(b.stationLabel ?? '').trim().slice(0, 30) || null;
    return out;
  }

  app.post('/api/admin/vendors', guard((req, res) => {
    const f = vendorFields(req.body ?? {}, false);
    if (get('SELECT 1 FROM vendors WHERE pin = ?', f.pin)) throw new HttpError(409, 'pin_taken');
    const id = newId();
    run(
      'INSERT INTO vendors (id, name, pin, token, discount_vnd, cluster, station_label, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      id,
      f.name as string,
      f.pin as string,
      newToken(),
      (f.discount_vnd as number) ?? 0,
      (f.cluster as string) ?? 'A',
      (f.station_label as string | null) ?? null,
      ctx.nowIso(),
    );
    res.status(201).json(vendorRow(get('SELECT * FROM vendors WHERE id = ?', id)!));
  }));

  app.patch('/api/admin/vendors/:id', guard((req, res) => {
    const vendor = get('SELECT * FROM vendors WHERE id = ?', req.params.id);
    if (!vendor) throw new HttpError(404, 'vendor_not_found');
    const f = vendorFields(req.body ?? {}, true);
    if (f.pin && get('SELECT 1 FROM vendors WHERE pin = ? AND id != ?', f.pin, vendor.id)) throw new HttpError(409, 'pin_taken');
    for (const [col, value] of Object.entries(f)) run(`UPDATE vendors SET ${col} = ? WHERE id = ?`, value as any, vendor.id);
    res.json(vendorRow(get('SELECT * FROM vendors WHERE id = ?', vendor.id)!));
  }));

  // ---- rewards -----------------------------------------------------------------------------

  const rewardRow = (r: Record<string, any>) => ({
    id: r.id,
    titleVi: r.title_vi,
    titleEn: r.title_en,
    cost: r.cost_points,
    vendorId: r.vendor_id,
    vendor: r.vendor_name ?? null,
    active: !!r.active,
    issued: r.issued ?? 0,
    used: r.used ?? 0,
  });
  const rewardsList = () =>
    all(
      `SELECT r.*, v.name AS vendor_name,
              (SELECT COUNT(*) FROM redemptions d WHERE d.reward_id = r.id) AS issued,
              (SELECT COUNT(*) FROM redemptions d WHERE d.reward_id = r.id AND d.status = 'used') AS used
       FROM rewards r LEFT JOIN vendors v ON v.id = r.vendor_id ORDER BY r.cost_points`,
    ).map(rewardRow);

  app.get('/api/admin/rewards', guard((_req, res) => res.json(rewardsList())));

  app.post('/api/admin/rewards', guard((req, res) => {
    const b = req.body ?? {};
    const cost = Number(b.cost);
    if (!String(b.titleVi ?? '').trim() || !Number.isInteger(cost) || cost <= 0) throw new HttpError(400, 'bad_request');
    if (b.vendorId && !get('SELECT 1 FROM vendors WHERE id = ?', b.vendorId)) throw new HttpError(404, 'vendor_not_found');
    run(
      'INSERT INTO rewards (id, title_vi, title_en, cost_points, vendor_id, active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)',
      newId(),
      String(b.titleVi).trim(),
      String(b.titleEn ?? '').trim() || String(b.titleVi).trim(),
      cost,
      b.vendorId || null,
      ctx.nowIso(),
    );
    res.status(201).json(rewardsList());
  }));

  app.patch('/api/admin/rewards/:id', guard((req, res) => {
    if (!get('SELECT 1 FROM rewards WHERE id = ?', req.params.id)) throw new HttpError(404, 'reward_not_found');
    if (typeof req.body?.active === 'boolean') run('UPDATE rewards SET active = ? WHERE id = ?', req.body.active ? 1 : 0, req.params.id);
    res.json(rewardsList());
  }));

  // ---- cups --------------------------------------------------------------------------------

  app.post('/api/admin/cups', guard((req, res) => {
    const count = Math.min(Math.max(Math.round(Number(req.body?.count ?? 1)) || 1, 1), 500);
    const cups = ctx.tx(() => Array.from({ length: count }, () => publicCup(ctx, createCup(ctx, 'qr'))));
    res.status(201).json(cups);
  }));

  app.get('/api/admin/cups', guard((_req, res) => {
    res.json(all('SELECT * FROM cups ORDER BY created_at DESC LIMIT 2000').map((c) => publicCup(ctx, c)));
  }));

  // ---- exports -----------------------------------------------------------------------------

  // Research dataset: participants who consented to research, pseudonymous ids, no names.
  app.get('/api/admin/export/scans.csv', guard((_req, res) => {
    const clock = studyClock(ctx);
    const tz = ctx.config.tzOffsetMin;
    const rows = all(
      `SELECT s.*, u.arm, u.faculty, u.intake, c.kind AS cup_kind, v.cluster
       FROM scans s JOIN users u ON u.id = s.user_id JOIN cups c ON c.id = s.cup_id LEFT JOIN vendors v ON v.id = s.vendor_id
       WHERE u.consent_research = 1 ORDER BY s.created_at`,
    );
    sendCsv(
      res,
      'onecup-research-scans.csv',
      ['created_at', 'local_day', 'pilot_week', 'participant', 'arm', 'faculty', 'intake', 'cup', 'cup_kind', 'vendor', 'cluster', 'tier', 'verified', 'method', 'source', 'tx_duration_ms', 'discount_vnd', 'points'],
      rows.map((r) => {
        const day = localDay(r.created_at, tz);
        return [r.created_at, day, clock.weekOfDay(day), pseudonym(ctx, r.user_id), ARM_LETTER[r.arm as keyof typeof ARM_LETTER] ?? r.arm, r.faculty, r.intake, pseudonym(ctx, r.cup_id, 'cup'), r.cup_kind, r.vendor_id, r.cluster, r.tier, r.verified, r.method, r.source, r.tx_duration_ms, r.discount_vnd, r.points];
      }),
    );
  }));

  // Open dataset: only participants who opted in, aggregated to participant-weeks, separate pseudonyms.
  app.get('/api/admin/export/open-data.csv', guard((_req, res) => {
    const s = readSettings(ctx);
    const clock = studyClock(ctx, s);
    const tz = ctx.config.tzOffsetMin;
    const lastWeek = Math.min(Math.max(clock.week, 0), s.pilotWeeks);
    const users = all('SELECT id, arm, faculty, created_at FROM users WHERE consent_open_data = 1 AND consent_research = 1');
    const counts = new Map<string, { v: number; u: number }>();
    for (const r of all(
      `SELECT s.user_id, date(s.created_at, ?) AS day, s.verified FROM scans s JOIN users u ON u.id = s.user_id WHERE u.consent_open_data = 1`,
      sqlShift(tz),
    )) {
      const key = `${r.user_id}|${clock.weekOfDay(r.day)}`;
      const c = counts.get(key) ?? { v: 0, u: 0 };
      if (r.verified) c.v++;
      else c.u++;
      counts.set(key, c);
    }
    const rows: unknown[][] = [];
    for (const u of users) {
      const from = Math.max(1, clock.weekOfDay(localDay(u.created_at, tz)));
      for (let w = from; w <= lastWeek; w++) {
        const c = counts.get(`${u.id}|${w}`) ?? { v: 0, u: 0 };
        rows.push([pseudonym(ctx, u.id, 'open'), ARM_LETTER[u.arm as keyof typeof ARM_LETTER] ?? u.arm, u.faculty, w, c.v, c.u]);
      }
    }
    sendCsv(res, 'onecup-open-data.csv', ['participant', 'arm', 'faculty', 'pilot_week', 'verified_uses', 'unverified_uses'], rows);
  }));

  app.get('/api/admin/export/vendor-days.csv', guard((_req, res) => {
    const clock = studyClock(ctx);
    const scans = new Map(
      all(`SELECT vendor_id, date(created_at, ?) AS day, COUNT(*) AS n FROM scans WHERE verified = 1 GROUP BY vendor_id, day`, sqlShift(ctx.config.tzOffsetMin)).map((r) => [
        `${r.vendor_id}|${r.day}`,
        r.n,
      ]),
    );
    const rows = all('SELECT d.*, v.name, v.cluster FROM vendor_days d JOIN vendors v ON v.id = d.vendor_id ORDER BY d.day, v.name');
    sendCsv(
      res,
      'onecup-vendor-days.csv',
      ['day', 'pilot_week', 'vendor', 'cluster', 'intervention', 'drinks_total', 'reusable_observed', 'verified_scans'],
      rows.map((r) => {
        const week = clock.weekOfDay(r.day);
        return [r.day, week, r.name, r.cluster, week >= clock.clusterStart(r.cluster) ? 1 : 0, r.drinks_total, r.reusable_observed, scans.get(`${r.vendor_id}|${r.day}`) ?? 0];
      }),
    );
  }));
}
