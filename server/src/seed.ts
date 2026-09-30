// Creates the pilot outlets (4 outlets in 3 stepped-wedge clusters) and the reward catalogue.
//   npm run seed -w server
import { loadConfig } from './config.ts';
import { openDb } from './db.ts';
import { newId, newToken } from './domain.ts';
import { makeCtx } from './http.ts';
import { writeSettings } from './services/settings.ts';

export const PILOT_VENDORS = [
  { name: 'Campus Café', pin: '1111', cluster: 'A', station: 'Trạm 1', discount: 3000 },
  { name: 'Kiosk North', pin: '2222', cluster: 'A', station: 'Trạm 1', discount: 3000 },
  { name: 'Canteen Block B', pin: '3333', cluster: 'B', station: 'Trạm 1', discount: 3000 },
  { name: 'Library Kiosk', pin: '4444', cluster: 'C', station: 'Trạm 1', discount: 3000 },
];

export const PILOT_REWARDS = [
  { vi: 'Upsize miễn phí', en: 'Free upsize', cost: 150, vendor: 'Campus Café' },
  { vi: 'Giảm 20% mọi đồ uống', en: '20% off any drink', cost: 300, vendor: 'Canteen Block B' },
  { vi: 'Cà phê phin miễn phí', en: 'Free phin coffee', cost: 600, vendor: 'Library Kiosk' },
];

export function seedPilot(ctx: ReturnType<typeof makeCtx>, log = console.log) {
  const now = ctx.nowIso();
  for (const v of PILOT_VENDORS) {
    if (ctx.get('SELECT 1 FROM vendors WHERE pin = ?', v.pin)) continue;
    ctx.run(
      'INSERT INTO vendors (id, name, pin, token, discount_vnd, cluster, station_label, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      newId(), v.name, v.pin, newToken(), v.discount, v.cluster, v.station, now,
    );
    log(`Quầy "${v.name}" (cụm ${v.cluster}) — PIN ${v.pin}`);
  }
  if (!ctx.get('SELECT 1 FROM rewards LIMIT 1')) {
    for (const r of PILOT_REWARDS) {
      const vendor = ctx.get('SELECT id FROM vendors WHERE name = ?', r.vendor);
      ctx.run(
        'INSERT INTO rewards (id, title_vi, title_en, cost_points, vendor_id, active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)',
        newId(), r.vi, r.en, r.cost, vendor?.id ?? null, now,
      );
    }
    log(`${PILOT_REWARDS.length} phần thưởng`);
  }
  if (!ctx.get("SELECT 1 FROM settings WHERE key = 'cluster_starts'")) writeSettings(ctx, { clusterStarts: { A: 1, B: 5, C: 9 } });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const config = loadConfig();
  const ctx = makeCtx(openDb(config.dbPath), config);
  seedPilot(ctx);
  console.log(`Xong. Console nghiên cứu: /admin (admin key: ${config.adminKey})`);
}
