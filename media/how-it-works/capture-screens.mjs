// Captures the One Cup app screens used in the "How One Cup works" video segment.
// Needs a server running with the demo data (see docs/DEMO.md), e.g.:
//   DB_PATH=showcase.sqlite PUBLIC_URL=http://localhost:3001 npm run seed:demo -w server -- --force
//   DB_PATH=showcase.sqlite PUBLIC_URL=http://localhost:3001 PORT=3001 npm start
// Usage: node capture-screens.mjs <outDir> [baseUrl] [userToken]
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { mkdirSync } from 'node:fs';

const [outDir = 'screens', base = 'http://localhost:3001', userToken] = process.argv.slice(2);
if (!userToken) throw new Error('Pass the demo user token printed by seed:demo (…/me#t=<token>)');
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const admin = 'change-me-admin';

async function ctxWith(viewport, storage, session = {}) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  await ctx.addInitScript(
    ([s, ss]) => {
      for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
      for (const [k, v] of Object.entries(ss)) sessionStorage.setItem(k, v);
    },
    [storage, session],
  );
  return ctx;
}

async function shot(ctx, path, file, { wait = 1200, full = false, before } = {}) {
  const page = await ctx.newPage();
  await page.goto(base + path, { waitUntil: 'networkidle' });
  if (before) await before(page);
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `${outDir}/${file}.png`, fullPage: full });
  await page.close();
  console.log('saved', file);
}

// 800 px tall: the video adds a 44 px status bar above each phone screenshot (390×844 overall).
const phone = { width: 390, height: 800 };
const student = await ctxWith(phone, { 'onecup.lang': 'en', 'onecup.userToken': userToken });
for (const [p, f] of [
  ['/me', 'student-home'],
  ['/me/journey', 'student-journey'],
  ['/me/league', 'student-league'],
  ['/me/rewards', 'student-rewards'],
  ['/me/register-cup', 'student-register'],
  ['/me/profile', 'student-profile'],
]) await shot(student, p, f);
await shot(student, '/me', 'student-home-full', { full: true });

// A verified counter scan, then the celebration screen the student sees.
const login = await fetch(base + '/api/vendor/login', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ pin: '1111' }),
}).then((r) => r.json());
const tablet = { width: 768, height: 1024 };
const vendor = await ctxWith(tablet, { 'onecup.lang': 'en', 'onecup.vendorToken': login.token, 'onecup.staffName': 'Lan' });
await shot(vendor, '/vendor', 'vendor-scan-idle');
await shot(vendor, '/vendor', 'vendor-scan-result', {
  wait: 1500,
  before: async (page) => {
    const input = page.locator('input').first();
    await input.click();
    await input.fill(process.env.CUP_CODE ?? '539EUY');
    await input.press('Enter');
    await page.waitForTimeout(800);
    await input.blur();
    await page.evaluate(() => window.scrollTo(0, 0));
  },
});
await shot(vendor, '/vendor/today', 'vendor-today');
await shot(vendor, '/vendor/station', 'vendor-station');

const me = await fetch(base + '/api/me', { headers: { authorization: `Bearer ${userToken}` } }).then((r) => r.json());
const lastScan = me?.recent?.[0]?.id ?? me?.lastScan?.id ?? me?.scans?.[0]?.id;
if (lastScan) await shot(student, `/me/celebrate/${lastScan}`, 'student-celebrate', { wait: 2500 });
else console.log('no scan id in /api/me; keys:', Object.keys(me));
await shot(student, '/me', 'student-home-after', { wait: 1500 });

const desk = { width: 1440, height: 900 };
const con = await ctxWith(desk, { 'onecup.lang': 'en' }, { 'onecup.adminKey': admin });
await shot(con, '/admin', 'console-overview', { wait: 2000 });
await shot(con, '/admin/analysis', 'console-analysis', { wait: 2000 });
await shot(con, '/admin', 'console-overview-full', { wait: 2000, full: true });

await browser.close();
