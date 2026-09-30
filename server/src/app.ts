import express, { type NextFunction, type Request, type Response } from 'express';
import { createHmac } from 'node:crypto';
import type { Config } from './config.ts';
import type { DB } from './db.ts';
import {
  badgesFor,
  currentStationCode,
  cupUrl,
  featuresFor,
  impactOf,
  newCupCode,
  newId,
  newToken,
  normalizeUid,
  parseCupCode,
  randomArm,
  verifyStationCode,
} from './domain.ts';

type Row = Record<string, any>;
type Tier = 1 | 2 | 3;

const SOURCES = ['camera', 'webnfc', 'usb-hid', 'pcsc-bridge', 'manual'] as const;

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const now = () => new Date().toISOString();

export function createApp(db: DB, config: Config) {
  const app = express();
  app.use(express.json({ limit: '100kb' }));

  const get = (sql: string, ...params: any[]) => db.prepare(sql).get(...params) as Row | undefined;
  const all = (sql: string, ...params: any[]) => db.prepare(sql).all(...params) as Row[];
  const run = (sql: string, ...params: any[]) => db.prepare(sql).run(...params);

  // ---- auth ------------------------------------------------------------------------------

  const bearer = (req: Request) => req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];

  function requireUser(req: Request): Row {
    const token = bearer(req);
    const user = token ? get('SELECT * FROM users WHERE token = ?', token) : undefined;
    if (!user) throw new HttpError(401, 'Cần đăng ký / đăng nhập người dùng');
    return user;
  }

  function requireVendor(req: Request): Row {
    const token = bearer(req);
    const vendor = token ? get('SELECT * FROM vendors WHERE token = ?', token) : undefined;
    if (!vendor) throw new HttpError(401, 'Cần đăng nhập quầy');
    return vendor;
  }

  function requireAdmin(req: Request) {
    if (req.headers['x-admin-key'] !== config.adminKey) throw new HttpError(401, 'Sai admin key');
  }

  // ---- scans -----------------------------------------------------------------------------

  /** Cooldown window for a new scan of the given tier, and which earlier tiers count against it. */
  function isDuplicate(cupId: string, tier: Tier): boolean {
    const minutes = tier === 1 ? config.cooldownMin.counter : tier === 2 ? config.cooldownMin.station : config.cooldownMin.self;
    // A self-scan is blocked by any recent scan; verified scans are only blocked by other verified scans,
    // so an earlier unverified self-scan never prevents the counter from recording the real use.
    const tiers = tier === 3 ? [1, 2, 3] : [1, 2];
    const since = new Date(Date.now() - minutes * 60_000).toISOString();
    return !!get(
      `SELECT 1 FROM scans WHERE cup_id = ? AND created_at > ? AND tier IN (${tiers.join(',')}) LIMIT 1`,
      cupId,
      since,
    );
  }

  function insertScan(s: {
    cup: Row;
    tier: Tier;
    method: 'qr' | 'nfc';
    source: string;
    vendorId?: string | null;
    txDurationMs?: number | null;
    discountVnd?: number;
  }) {
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
      discount_vnd: s.discountVnd ?? 0,
      created_at: now(),
    };
    run(
      `INSERT INTO scans (id, cup_id, user_id, vendor_id, tier, verified, method, source, tx_duration_ms, discount_vnd, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ...Object.values(row),
    );
    return row;
  }

  const publicCup = (cup: Row) => ({
    id: cup.id,
    kind: cup.kind,
    code: cup.code,
    nfcUid: cup.nfc_uid,
    url: cupUrl(config.publicUrl, cup.code),
    linked: !!cup.user_id,
    linkedAt: cup.linked_at,
    createdAt: cup.created_at,
  });

  function createCup(kind: 'qr' | 'nfc', nfcUid: string | null = null): Row {
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = newCupCode();
      if (get('SELECT 1 FROM cups WHERE code = ?', code)) continue;
      const cup = { id: newId(), kind, code, nfc_uid: nfcUid, user_id: null, linked_at: null, created_at: now() };
      run('INSERT INTO cups (id, kind, code, nfc_uid, user_id, linked_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', ...Object.values(cup));
      return cup;
    }
    throw new HttpError(500, 'Không tạo được mã cốc');
  }

  function userSummary(user: Row) {
    const cups = all('SELECT * FROM cups WHERE user_id = ? ORDER BY linked_at', user.id);
    const counts = get(
      'SELECT COUNT(*) AS total, COALESCE(SUM(verified), 0) AS verified FROM scans WHERE user_id = ?',
      user.id,
    )!;
    const recent = all(
      `SELECT s.id, s.tier, s.verified, s.method, s.source, s.created_at, s.discount_vnd, v.name AS vendor_name, c.code AS cup_code
       FROM scans s JOIN cups c ON c.id = s.cup_id LEFT JOIN vendors v ON v.id = s.vendor_id
       WHERE s.user_id = ? ORDER BY s.created_at DESC LIMIT 20`,
      user.id,
    );
    const features = featuresFor(user.arm, config.studyMode);
    return {
      user: {
        id: user.id,
        nickname: user.nickname,
        consentParticipate: !!user.consent_participate,
        consentResearch: !!user.consent_research,
        preferredMethod: user.preferred_method,
        createdAt: user.created_at,
      },
      features,
      cups: cups.map(publicCup),
      uses: { total: counts.total, verified: counts.verified },
      impact: features.impactFeedback ? impactOf(counts.total, config.impact) : null,
      badges: features.badges ? badgesFor(counts.total) : null,
      recent,
    };
  }

  // ---- public ----------------------------------------------------------------------------

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, studyMode: config.studyMode, publicUrl: config.publicUrl });
  });

  app.get('/api/cups/:code', (req, res) => {
    const code = parseCupCode(req.params.code);
    const cup = code ? get('SELECT * FROM cups WHERE code = ?', code) : undefined;
    if (!cup) throw new HttpError(404, 'Không tìm thấy cốc');
    const token = bearer(req);
    const owner = cup.user_id ? get('SELECT token FROM users WHERE id = ?', cup.user_id) : undefined;
    res.json({ ...publicCup(cup), mine: !!token && owner?.token === token });
  });

  // ---- student ---------------------------------------------------------------------------

  app.post('/api/users', (req, res) => {
    const { nickname, consentParticipate, consentResearch, preferredMethod } = req.body ?? {};
    if (consentParticipate !== true) throw new HttpError(400, 'Cần đồng ý tham gia để sử dụng ứng dụng');
    const user = {
      id: newId(),
      token: newToken(),
      nickname: String(nickname ?? '').trim().slice(0, 40) || `Bạn-${newCupCode(4)}`,
      arm: randomArm(),
      preferred_method: preferredMethod === 'nfc' || preferredMethod === 'qr' ? preferredMethod : null,
      consent_participate: 1,
      consent_research: consentResearch === true ? 1 : 0,
      created_at: now(),
    };
    run(
      `INSERT INTO users (id, token, nickname, arm, preferred_method, consent_participate, consent_research, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ...Object.values(user),
    );
    res.status(201).json({ token: user.token, ...userSummary(user) });
  });

  app.get('/api/me', (req, res) => {
    res.json(userSummary(requireUser(req)));
  });

  app.patch('/api/me', (req, res) => {
    const user = requireUser(req);
    const { nickname, consentResearch } = req.body ?? {};
    if (typeof nickname === 'string' && nickname.trim()) {
      run('UPDATE users SET nickname = ? WHERE id = ?', nickname.trim().slice(0, 40), user.id);
    }
    if (typeof consentResearch === 'boolean') {
      run('UPDATE users SET consent_research = ? WHERE id = ?', consentResearch ? 1 : 0, user.id);
    }
    res.json(userSummary(get('SELECT * FROM users WHERE id = ?', user.id)!));
  });

  app.get('/api/me/export', (req, res) => {
    const user = requireUser(req);
    const { token: _token, ...profile } = user;
    res.setHeader('Content-Disposition', 'attachment; filename="onecup-my-data.json"');
    res.json({
      exportedAt: now(),
      profile,
      cups: all('SELECT * FROM cups WHERE user_id = ?', user.id),
      scans: all('SELECT * FROM scans WHERE user_id = ? ORDER BY created_at', user.id),
    });
  });

  app.delete('/api/me', (req, res) => {
    const user = requireUser(req);
    // Scans cascade-delete with the user; cups are released so they can be linked again.
    run('UPDATE cups SET user_id = NULL, linked_at = NULL WHERE user_id = ?', user.id);
    run('DELETE FROM users WHERE id = ?', user.id);
    res.status(204).end();
  });

  app.post('/api/me/cups', (req, res) => {
    const user = requireUser(req);
    const { code: rawCode, nfcUid: rawUid } = req.body ?? {};
    let cup: Row | undefined;
    if (rawUid) {
      const uid = normalizeUid(String(rawUid));
      if (!uid) throw new HttpError(400, 'UID NFC không hợp lệ');
      cup = get('SELECT * FROM cups WHERE nfc_uid = ?', uid) ?? createCup('nfc', uid);
    } else {
      const code = parseCupCode(String(rawCode ?? ''));
      cup = code ? get('SELECT * FROM cups WHERE code = ?', code) : undefined;
      if (!cup) throw new HttpError(404, 'Không tìm thấy cốc với mã này');
    }
    if (cup.user_id && cup.user_id !== user.id) throw new HttpError(409, 'Cốc này đã được liên kết với tài khoản khác');
    if (!cup.user_id) {
      run('UPDATE cups SET user_id = ?, linked_at = ? WHERE id = ?', user.id, now(), cup.id);
    }
    res.status(201).json(userSummary(user));
  });

  app.delete('/api/me/cups/:id', (req, res) => {
    const user = requireUser(req);
    run('UPDATE cups SET user_id = NULL, linked_at = NULL WHERE id = ? AND user_id = ?', req.params.id, user.id);
    res.json(userSummary(user));
  });

  function ownCup(user: Row, cupId: unknown): Row {
    const cup = get('SELECT * FROM cups WHERE id = ? AND user_id = ?', String(cupId ?? ''), user.id);
    if (!cup) throw new HttpError(404, 'Không tìm thấy cốc của bạn');
    return cup;
  }

  // Tier 3: the student scans their own cup. Rate-limited and flagged as unverified.
  app.post('/api/me/scans/self', (req, res) => {
    const user = requireUser(req);
    const cup = ownCup(user, req.body?.cupId);
    if (isDuplicate(cup.id, 3)) throw new HttpError(429, 'Bạn vừa ghi nhận cốc này gần đây, hãy thử lại sau');
    const scan = insertScan({ cup, tier: 3, method: cup.kind, source: 'self' });
    res.status(201).json({ scan, ...userSummary(user) });
  });

  // Tier 2: the student scans the rotating code shown on a station screen.
  app.post('/api/me/scans/station', (req, res) => {
    const user = requireUser(req);
    const { vendorId, code, cupId } = req.body ?? {};
    const vendor = get('SELECT * FROM vendors WHERE id = ?', String(vendorId ?? ''));
    if (!vendor) throw new HttpError(404, 'Không tìm thấy quầy');
    if (!verifyStationCode(config.stationSecret, vendor.id, config.stationCodeTtlSec, String(code ?? ''))) {
      throw new HttpError(400, 'Mã quầy đã hết hạn, hãy quét lại mã trên màn hình');
    }
    const cup = ownCup(user, cupId);
    if (isDuplicate(cup.id, 2)) throw new HttpError(429, 'Cốc này vừa được ghi nhận');
    const scan = insertScan({ cup, tier: 2, method: cup.kind, source: 'station', vendorId: vendor.id });
    res.status(201).json({ scan, vendor: { name: vendor.name }, ...userSummary(user) });
  });

  // ---- vendor terminal -------------------------------------------------------------------

  const publicVendor = (v: Row) => ({ id: v.id, name: v.name, discountVnd: v.discount_vnd });

  app.post('/api/vendor/login', (req, res) => {
    const vendor = get('SELECT * FROM vendors WHERE pin = ?', String(req.body?.pin ?? ''));
    if (!vendor) throw new HttpError(401, 'Sai mã PIN quầy');
    res.json({ token: vendor.token, vendor: publicVendor(vendor) });
  });

  app.get('/api/vendor/me', (req, res) => {
    res.json(publicVendor(requireVendor(req)));
  });

  // Tier 1: staff scans the cup at the counter (QR camera, Web NFC, USB reader or PC/SC bridge).
  app.post('/api/vendor/scans', (req, res) => {
    const vendor = requireVendor(req);
    const { method, source, value, txDurationMs } = req.body ?? {};
    if (method !== 'qr' && method !== 'nfc') throw new HttpError(400, 'method phải là qr hoặc nfc');
    if (!SOURCES.includes(source)) throw new HttpError(400, `source phải là một trong ${SOURCES.join(', ')}`);

    let cup: Row | undefined;
    if (method === 'nfc') {
      const uid = normalizeUid(String(value ?? ''));
      if (!uid) throw new HttpError(400, `UID NFC không hợp lệ: ${value}`);
      cup = get('SELECT * FROM cups WHERE nfc_uid = ?', uid);
      if (!cup) return res.json({ status: 'unknown', method, uid });
    } else {
      const code = parseCupCode(String(value ?? ''));
      cup = code ? get('SELECT * FROM cups WHERE code = ?', code) : undefined;
      if (!cup) return res.json({ status: 'unknown', method, value });
    }

    if (isDuplicate(cup.id, 1)) return res.json({ status: 'duplicate', cup: publicCup(cup) });

    const duration = Number.isFinite(txDurationMs) && txDurationMs > 0 && txDurationMs < 600_000 ? Math.round(txDurationMs) : null;
    const scan = insertScan({
      cup,
      tier: 1,
      method,
      source,
      vendorId: vendor.id,
      txDurationMs: duration,
      discountVnd: cup.user_id ? vendor.discount_vnd : 0,
    });
    const user = cup.user_id ? get('SELECT * FROM users WHERE id = ?', cup.user_id) : undefined;
    const uses = user ? get('SELECT COUNT(*) AS n FROM scans WHERE user_id = ?', user.id)!.n : 0;
    res.json({
      status: user ? 'ok' : 'unlinked',
      scan,
      cup: publicCup(cup),
      user: user ? { nickname: user.nickname, uses } : null,
      discountVnd: scan.discount_vnd,
    });
  });

  // Register a fresh NFC tag (e.g. an anti-metal sticker put on a student's bottle).
  app.post('/api/vendor/tags', (req, res) => {
    requireVendor(req);
    const uid = normalizeUid(String(req.body?.uid ?? ''));
    if (!uid) throw new HttpError(400, 'UID NFC không hợp lệ');
    const existing = get('SELECT * FROM cups WHERE nfc_uid = ?', uid);
    const cup = existing ?? createCup('nfc', uid);
    res.status(existing ? 200 : 201).json({ created: !existing, cup: publicCup(cup) });
  });

  app.get('/api/vendor/scans', (req, res) => {
    const vendor = requireVendor(req);
    res.json(
      all(
        `SELECT s.id, s.tier, s.method, s.source, s.tx_duration_ms, s.discount_vnd, s.created_at, c.code AS cup_code, u.nickname
         FROM scans s JOIN cups c ON c.id = s.cup_id LEFT JOIN users u ON u.id = s.user_id
         WHERE s.vendor_id = ? ORDER BY s.created_at DESC LIMIT 30`,
        vendor.id,
      ),
    );
  });

  app.get('/api/vendor/station-code', (req, res) => {
    const vendor = requireVendor(req);
    const { code, expiresAt } = currentStationCode(config.stationSecret, vendor.id, config.stationCodeTtlSec);
    res.json({ vendorId: vendor.id, code, expiresAt, url: `${config.publicUrl}/s/${vendor.id}/${code}` });
  });

  // ---- admin -----------------------------------------------------------------------------

  app.get('/api/admin/vendors', (req, res) => {
    requireAdmin(req);
    res.json(all('SELECT id, name, pin, discount_vnd, created_at FROM vendors ORDER BY created_at'));
  });

  app.post('/api/admin/vendors', (req, res) => {
    requireAdmin(req);
    const { name, pin, discountVnd } = req.body ?? {};
    if (!name || !/^\d{4,8}$/.test(String(pin ?? ''))) throw new HttpError(400, 'Cần tên quầy và PIN 4–8 chữ số');
    if (get('SELECT 1 FROM vendors WHERE pin = ?', String(pin))) throw new HttpError(409, 'PIN đã được dùng');
    const vendor = { id: newId(), name: String(name), pin: String(pin), token: newToken(), discount_vnd: Number(discountVnd ?? 0), created_at: now() };
    run('INSERT INTO vendors (id, name, pin, token, discount_vnd, created_at) VALUES (?, ?, ?, ?, ?, ?)', ...Object.values(vendor));
    res.status(201).json(publicVendor(vendor));
  });

  app.post('/api/admin/cups', (req, res) => {
    requireAdmin(req);
    const count = Math.min(Math.max(Number(req.body?.count ?? 1), 1), 500);
    const cups = Array.from({ length: count }, () => publicCup(createCup('qr')));
    res.status(201).json(cups);
  });

  app.get('/api/admin/cups', (req, res) => {
    requireAdmin(req);
    res.json(all('SELECT * FROM cups ORDER BY created_at DESC LIMIT 1000').map(publicCup));
  });

  app.get('/api/admin/stats', (req, res) => {
    requireAdmin(req);
    res.json({
      totals: get(
        `SELECT (SELECT COUNT(*) FROM users) AS users,
                (SELECT COUNT(*) FROM cups) AS cups,
                (SELECT COUNT(*) FROM cups WHERE user_id IS NOT NULL) AS linked_cups,
                (SELECT COUNT(*) FROM scans WHERE verified = 1) AS verified_scans,
                (SELECT COUNT(*) FROM scans WHERE verified = 0) AS unverified_scans`,
      ),
      // H3: counter transactions by technology — count and timing.
      counterByMethod: all(
        `SELECT method, source, COUNT(*) AS scans, COUNT(tx_duration_ms) AS timed,
                ROUND(AVG(tx_duration_ms)) AS avg_tx_ms, MIN(tx_duration_ms) AS min_tx_ms, MAX(tx_duration_ms) AS max_tx_ms
         FROM scans WHERE tier = 1 GROUP BY method, source ORDER BY method, source`,
      ),
      byTier: all('SELECT tier, COUNT(*) AS scans FROM scans GROUP BY tier ORDER BY tier'),
      byVendor: all(
        `SELECT v.name, COUNT(s.id) AS verified_scans FROM vendors v
         LEFT JOIN scans s ON s.vendor_id = v.id AND s.verified = 1 GROUP BY v.id ORDER BY verified_scans DESC`,
      ),
      byDay: all(
        `SELECT substr(created_at, 1, 10) AS day, SUM(verified) AS verified, SUM(1 - verified) AS unverified
         FROM scans GROUP BY day ORDER BY day DESC LIMIT 30`,
      ),
      arms: all('SELECT arm, COUNT(*) AS users FROM users GROUP BY arm ORDER BY arm'),
      impact: impactOf(get('SELECT COUNT(*) AS n FROM scans WHERE verified = 1')!.n, config.impact),
      impactCoefficients: config.impact,
    });
  });

  // Research export: only users with research consent, pseudonymised ids, no nicknames.
  app.get('/api/admin/export.csv', (req, res) => {
    requireAdmin(req);
    const pseudo = (id: string | null) =>
      id ? createHmac('sha256', `export:${config.stationSecret}`).update(id).digest('hex').slice(0, 16) : '';
    const rows = all(
      `SELECT s.created_at, s.user_id, u.arm, s.cup_id, c.kind AS cup_kind, s.vendor_id, s.tier, s.verified,
              s.method, s.source, s.tx_duration_ms, s.discount_vnd
       FROM scans s JOIN users u ON u.id = s.user_id JOIN cups c ON c.id = s.cup_id
       WHERE u.consent_research = 1 ORDER BY s.created_at`,
    );
    const header = ['created_at', 'participant', 'arm', 'cup', 'cup_kind', 'vendor', 'tier', 'verified', 'method', 'source', 'tx_duration_ms', 'discount_vnd'];
    const lines = rows.map((r) =>
      [r.created_at, pseudo(r.user_id), r.arm, pseudo(r.cup_id), r.cup_kind, r.vendor_id ?? '', r.tier, r.verified, r.method, r.source, r.tx_duration_ms ?? '', r.discount_vnd].join(','),
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="onecup-scans.csv"');
    res.send([header.join(','), ...lines].join('\n') + '\n');
  });

  // ---- errors ----------------------------------------------------------------------------

  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Không có endpoint này')));

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err instanceof HttpError ? err.status : err?.type === 'entity.parse.failed' ? 400 : 500;
    if (status === 500) console.error(err);
    res.status(status).json({ error: status === 500 ? 'Lỗi máy chủ' : err.message });
  });

  return app;
}
