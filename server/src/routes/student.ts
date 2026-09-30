import type { Express, Request } from 'express';
import { featuresFor, impactOf, milestonesFor, newCode, newId, newToken, normalizeUid, parseCupCode, pickArm, verifyStationCode, voucherUrl } from '../domain.ts';
import { bearer, failureLimiter, HttpError, type Ctx, type Row } from '../http.ts';
import { leagueFor } from '../services/leagues.ts';
import { goalState, pointsBalance, recentScans } from '../services/progress.ts';
import { createCup, flagDuplicate, insertScan, isDuplicate, publicCup, findCupByUid } from '../services/scans.ts';
import { readSettings, studyClock } from '../services/settings.ts';
import { impactPerCup } from '../services/stats.ts';

const clean = (v: unknown, max = 60) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export function studentRoutes(app: Express, ctx: Ctx) {
  const { get, all, run } = ctx;
  const codeGuesses = failureLimiter(10, 10 * 60_000);

  function requireUser(req: Request): Row {
    const token = bearer(req);
    const user = token ? get('SELECT * FROM users WHERE token = ?', token) : undefined;
    if (!user) throw new HttpError(401, 'unauthorized');
    return user;
  }

  const featuresOf = (user: Row) => {
    const clock = studyClock(ctx);
    return { clock, features: featuresFor(user.arm, { studyMode: ctx.config.studyMode, studyEnded: clock.studyEnded }) };
  };

  function summary(user: Row) {
    const s = readSettings(ctx);
    const { clock, features } = featuresOf(user);
    const counts = get('SELECT COUNT(*) AS total, COALESCE(SUM(verified), 0) AS verified FROM scans WHERE user_id = ?', user.id)!;
    const goal = goalState(ctx, user.id);
    const league = features.gamification ? leagueFor(ctx, user.id) : null;
    return {
      user: {
        id: user.id,
        nickname: user.nickname,
        faculty: user.faculty,
        intake: user.intake,
        consentResearch: !!user.consent_research,
        consentOpenData: !!user.consent_open_data,
        preferredMethod: user.preferred_method,
        createdAt: user.created_at,
      },
      features,
      study: { studyEnd: s.studyEnd, rewardsEnd: s.rewardsEnd, rewardsOpen: clock.rewardsOpen, ended: clock.studyEnded },
      cups: all('SELECT * FROM cups WHERE user_id = ? ORDER BY linked_at', user.id).map((c) => publicCup(ctx, c)),
      uses: { total: counts.total, verified: counts.verified, today: goal.today },
      goal: features.gamification ? goal : null,
      points: features.gamification ? pointsBalance(ctx, user.id) : null,
      impact: features.impactFeedback ? impactOf(counts.total, ctx.config.impact) : null,
      impactPerCup: impactPerCup(ctx),
      milestones: features.gamification ? milestonesFor(counts.total) : null,
      league: league && {
        tier: league.tier,
        topTier: league.topTier,
        rank: league.rank,
        cups: league.members.find((m) => m.me)?.cups ?? 0,
        daysLeft: league.daysLeft,
        promote: league.promote,
      },
      recent: recentScans(ctx, user.id),
    };
  }

  /** A participant's cup given by id, code (QR / NDEF URL) or NFC UID. */
  function resolveOwnCup(user: Row, body: any): Row {
    let cup: Row | undefined;
    if (body?.cupId) cup = get('SELECT * FROM cups WHERE id = ?', String(body.cupId));
    else if (body?.nfcUid) {
      const uid = normalizeUid(String(body.nfcUid));
      cup = uid ? findCupByUid(ctx, uid) : undefined;
    } else if (body?.code) {
      const code = parseCupCode(String(body.code));
      cup = code ? get('SELECT * FROM cups WHERE code = ?', code) : undefined;
    } else {
      // No cup given: use the one used or linked most recently.
      cup = get(
        `SELECT c.* FROM cups c LEFT JOIN scans s ON s.cup_id = c.id WHERE c.user_id = ?
         GROUP BY c.id ORDER BY MAX(COALESCE(s.created_at, c.linked_at)) DESC LIMIT 1`,
        user.id,
      );
      if (!cup) throw new HttpError(400, 'no_cup');
    }
    if (!cup) throw new HttpError(404, 'cup_not_found');
    if (!cup.user_id) throw new HttpError(409, 'cup_unlinked', { code: cup.code });
    if (cup.user_id !== user.id) throw new HttpError(403, 'cup_not_yours');
    return cup;
  }

  // ---- account -----------------------------------------------------------------------------

  app.post('/api/users', (req, res) => {
    const b = req.body ?? {};
    if (b.consentParticipate !== true) throw new HttpError(400, 'consent_required');
    const faculty = clean(b.faculty, 40) || null;
    // Stratified block randomisation: balance the arms within each faculty.
    const counts = Object.fromEntries(
      all('SELECT arm, COUNT(*) AS n FROM users WHERE faculty IS ? GROUP BY arm', faculty).map((r) => [r.arm, r.n]),
    );
    const research = b.consentResearch === true;
    const user = {
      id: newId(),
      token: newToken(),
      nickname: clean(b.nickname, 40) || `Bạn ${newCode(4)}`,
      arm: pickArm(counts),
      preferred_method: b.preferredMethod === 'nfc' || b.preferredMethod === 'qr' ? b.preferredMethod : null,
      consent_participate: 1,
      consent_research: research ? 1 : 0,
      created_at: ctx.nowIso(),
      faculty,
      intake: clean(b.intake, 10) || null,
      consent_open_data: research && b.consentOpenData === true ? 1 : 0,
    };
    run(
      `INSERT INTO users (id, token, nickname, arm, preferred_method, consent_participate, consent_research, created_at, faculty, intake, consent_open_data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ...Object.values(user),
    );
    res.status(201).json({ token: user.token, ...summary(user) });
  });

  app.get('/api/me', (req, res) => {
    res.json(summary(requireUser(req)));
  });

  app.patch('/api/me', (req, res) => {
    const user = requireUser(req);
    const b = req.body ?? {};
    if (clean(b.nickname, 40)) run('UPDATE users SET nickname = ? WHERE id = ?', clean(b.nickname, 40), user.id);
    if (typeof b.faculty === 'string') run('UPDATE users SET faculty = ? WHERE id = ?', clean(b.faculty, 40) || null, user.id);
    if (typeof b.intake === 'string') run('UPDATE users SET intake = ? WHERE id = ?', clean(b.intake, 10) || null, user.id);
    if (typeof b.consentResearch === 'boolean') {
      run('UPDATE users SET consent_research = ? WHERE id = ?', b.consentResearch ? 1 : 0, user.id);
      // The open dataset is a subset of the research data: withdrawing from research withdraws both.
      if (!b.consentResearch) run('UPDATE users SET consent_open_data = 0 WHERE id = ?', user.id);
    }
    if (typeof b.consentOpenData === 'boolean') {
      const research = get('SELECT consent_research FROM users WHERE id = ?', user.id)!.consent_research;
      if (b.consentOpenData && !research) throw new HttpError(400, 'research_consent_required');
      run('UPDATE users SET consent_open_data = ? WHERE id = ?', b.consentOpenData ? 1 : 0, user.id);
    }
    res.json(summary(get('SELECT * FROM users WHERE id = ?', user.id)!));
  });

  app.get('/api/me/export', (req, res) => {
    const user = requireUser(req);
    const { token: _token, arm, ...profile } = user;
    // The experimental arm stays blinded until data collection ends.
    const ended = studyClock(ctx).studyEnded;
    res.setHeader('Content-Disposition', 'attachment; filename="onecup-my-data.json"');
    res.json({
      exportedAt: ctx.nowIso(),
      profile: ended ? { ...profile, arm } : profile,
      cups: all('SELECT * FROM cups WHERE user_id = ?', user.id),
      scans: all('SELECT * FROM scans WHERE user_id = ? ORDER BY created_at', user.id),
      redemptions: all('SELECT * FROM redemptions WHERE user_id = ? ORDER BY created_at', user.id),
    });
  });

  app.delete('/api/me', (req, res) => {
    const user = requireUser(req);
    // Scans, flags, vouchers and league rows cascade-delete with the user; cups are released.
    ctx.tx(() => {
      run('UPDATE cups SET user_id = NULL, linked_at = NULL WHERE user_id = ?', user.id);
      run('DELETE FROM users WHERE id = ?', user.id);
    });
    res.status(204).end();
  });

  // ---- cups --------------------------------------------------------------------------------

  app.post('/api/me/cups', (req, res) => {
    const user = requireUser(req);
    const nowMs = ctx.now().getTime();
    codeGuesses.check(`link:${user.id}`, nowMs);
    const { code: rawCode, nfcUid: rawUid } = req.body ?? {};
    let cup: Row | undefined;
    if (rawUid) {
      const uid = normalizeUid(String(rawUid));
      if (!uid) throw new HttpError(400, 'bad_uid');
      cup = findCupByUid(ctx, uid) ?? createCup(ctx, 'nfc', uid);
    } else {
      const code = parseCupCode(String(rawCode ?? ''));
      cup = code ? get('SELECT * FROM cups WHERE code = ?', code) : undefined;
      if (!cup) {
        codeGuesses.fail(`link:${user.id}`, nowMs);
        throw new HttpError(404, 'cup_not_found');
      }
    }
    if (cup.user_id && cup.user_id !== user.id) throw new HttpError(409, 'cup_taken');
    if (!cup.user_id) run('UPDATE cups SET user_id = ?, linked_at = ? WHERE id = ?', user.id, ctx.nowIso(), cup.id);
    res.status(201).json({ cup: publicCup(ctx, get('SELECT * FROM cups WHERE id = ?', cup.id)!), ...summary(user) });
  });

  app.delete('/api/me/cups/:id', (req, res) => {
    const user = requireUser(req);
    run('UPDATE cups SET user_id = NULL, linked_at = NULL WHERE id = ? AND user_id = ?', req.params.id, user.id);
    res.json(summary(user));
  });

  // ---- scans -------------------------------------------------------------------------------

  // Tier 3: the participant scans or taps their own cup. Rate-limited and flagged as unverified.
  app.post('/api/me/scans/self', (req, res) => {
    const user = requireUser(req);
    const cup = resolveOwnCup(user, req.body);
    if (isDuplicate(ctx, cup.id, 3)) {
      flagDuplicate(ctx, cup, 3);
      throw new HttpError(429, 'cooldown');
    }
    const scan = insertScan(ctx, { cup, tier: 3, method: cup.kind, source: 'self' });
    res.status(201).json({ scan, ...summary(user) });
  });

  // Tier 2: the participant scans (or types) the rotating 6-digit code shown at the counter.
  app.post('/api/me/scans/station', (req, res) => {
    const user = requireUser(req);
    const nowMs = ctx.now().getTime();
    codeGuesses.check(`station:${user.id}`, nowMs);
    const { vendorId, code } = req.body ?? {};
    const { stationSecret: secret, stationCodeTtlSec: ttl } = ctx.config;
    const candidates = vendorId ? all('SELECT * FROM vendors WHERE id = ?', String(vendorId)) : all('SELECT * FROM vendors');
    const vendor = candidates.find((v) => verifyStationCode(secret, v.id, ttl, String(code ?? ''), nowMs));
    if (!vendor) {
      codeGuesses.fail(`station:${user.id}`, nowMs);
      throw new HttpError(400, 'station_code_invalid');
    }
    const cup = resolveOwnCup(user, { cupId: req.body?.cupId });
    if (isDuplicate(ctx, cup.id, 2)) {
      flagDuplicate(ctx, cup, 2, vendor.id);
      throw new HttpError(429, 'cooldown');
    }
    const scan = insertScan(ctx, { cup, tier: 2, method: cup.kind, source: 'station', vendorId: vendor.id, discountVnd: vendor.discount_vnd });
    res.status(201).json({ scan, vendor: { name: vendor.name }, ...summary(user) });
  });

  // ---- league & rewards --------------------------------------------------------------------

  app.get('/api/me/league', (req, res) => {
    const user = requireUser(req);
    if (!featuresOf(user).features.gamification) throw new HttpError(403, 'feature_unavailable');
    res.json(leagueFor(ctx, user.id));
  });

  function rewardsView(user: Row) {
    const { clock } = featuresOf(user);
    const balance = pointsBalance(ctx, user.id);
    return {
      balance,
      open: clock.rewardsOpen,
      rewardsEnd: readSettings(ctx).rewardsEnd,
      items: all(
        `SELECT r.id, r.title_vi, r.title_en, r.cost_points, v.name AS vendor_name FROM rewards r
         LEFT JOIN vendors v ON v.id = r.vendor_id WHERE r.active = 1 ORDER BY r.cost_points`,
      ).map((r) => ({ id: r.id, titleVi: r.title_vi, titleEn: r.title_en, cost: r.cost_points, vendor: r.vendor_name, affordable: balance >= r.cost_points })),
      vouchers: all(
        `SELECT d.id, d.voucher, d.status, d.created_at, d.used_at, r.title_vi, r.title_en, v.name AS vendor_name
         FROM redemptions d JOIN rewards r ON r.id = d.reward_id LEFT JOIN vendors v ON v.id = r.vendor_id
         WHERE d.user_id = ? ORDER BY d.created_at DESC LIMIT 20`,
        user.id,
      ).map((d) => ({
        id: d.id,
        voucher: d.voucher,
        displayCode: `V-${d.voucher}`,
        url: voucherUrl(ctx.config.publicUrl, d.voucher),
        status: d.status,
        titleVi: d.title_vi,
        titleEn: d.title_en,
        vendor: d.vendor_name,
        createdAt: d.created_at,
        usedAt: d.used_at,
      })),
    };
  }

  app.get('/api/me/rewards', (req, res) => {
    const user = requireUser(req);
    if (!featuresOf(user).features.rewards) throw new HttpError(403, 'feature_unavailable');
    res.json(rewardsView(user));
  });

  app.post('/api/me/redemptions', (req, res) => {
    const user = requireUser(req);
    const { features, clock } = featuresOf(user);
    if (!features.rewards) throw new HttpError(403, 'feature_unavailable');
    if (!clock.rewardsOpen) throw new HttpError(403, 'rewards_closed');
    const reward = get('SELECT * FROM rewards WHERE id = ? AND active = 1', String(req.body?.rewardId ?? ''));
    if (!reward) throw new HttpError(404, 'reward_not_found');
    const created = ctx.tx(() => {
      if (pointsBalance(ctx, user.id) < reward.cost_points) throw new HttpError(400, 'not_enough_points');
      let voucher = newCode(6);
      while (get('SELECT 1 FROM redemptions WHERE voucher = ?', voucher)) voucher = newCode(6);
      const id = newId();
      run(
        `INSERT INTO redemptions (id, user_id, reward_id, cost_points, voucher, status, created_at) VALUES (?, ?, ?, ?, ?, 'issued', ?)`,
        id,
        user.id,
        reward.id,
        reward.cost_points,
        voucher,
        ctx.nowIso(),
      );
      return id;
    });
    const view = rewardsView(user);
    res.status(201).json({ voucher: view.vouchers.find((v) => v.id === created), ...view });
  });

  // ---- public ------------------------------------------------------------------------------

  app.get('/api/cups/:code', (req, res) => {
    const code = parseCupCode(req.params.code);
    const cup = code ? get('SELECT * FROM cups WHERE code = ?', code) : undefined;
    if (!cup) throw new HttpError(404, 'cup_not_found');
    const token = bearer(req);
    const owner = cup.user_id ? get('SELECT token FROM users WHERE id = ?', cup.user_id) : undefined;
    res.json({ ...publicCup(ctx, cup), mine: !!token && owner?.token === token });
  });
}
