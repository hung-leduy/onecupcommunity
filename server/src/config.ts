// Runtime configuration. All values can be overridden by environment variables.
// Pilot dates are only defaults: the research console stores its own values in the `settings` table.
export type Config = {
  port: number;
  dbPath: string;
  /** Public base URL encoded into cup QR codes, NFC NDEF records and station codes. */
  publicUrl: string;
  /** Key for /api/admin endpoints (sent as the X-Admin-Key header). */
  adminKey: string;
  /** Secret used to derive rotating station codes and pseudonymous ids in exports. */
  stationSecret: string;
  /** Lifetime of one rotating station code, in seconds. */
  stationCodeTtlSec: number;
  /** "on" = randomised feature arms are enforced; "off" = everyone sees every feature (demo / development). */
  studyMode: 'on' | 'off';
  /** Minimum gap between two counted scans of the same cup, per tier (minutes). */
  cooldownMin: { counter: number; station: number; self: number };
  /**
   * Impact coefficients per avoided single-use cup.
   * PLACEHOLDERS — replace with the values chosen from the LCA literature (e.g. Lee et al., 2025)
   * before any figure is reported.
   */
  impact: { plasticGramsPerCup: number; co2eGramsPerCup: number; singleUseCupCo2eGrams: number; uncertainty: number };
  /** Cups per day that complete the daily goal (and keep the streak alive). */
  dailyGoal: number;
  /** Points per counted use: verified (counter / station) and unverified self-scan. */
  points: { verified: number; self: number };
  /** What a vendor saves per reusable cup (the disposable cup it did not hand out), VND. */
  cupCostVnd: number;
  /** Local time zone offset in minutes (Viet Nam = UTC+7, no DST). */
  tzOffsetMin: number;
  league: { groupSize: number; promote: number };
  pilot: { start: string; weeks: number; studyEnd: string; rewardsEnd: string };
};

const env = process.env;
const num = (v: string | undefined, d: number) => (v === undefined || v === '' ? d : Number(v));

export function loadConfig(overrides: Partial<Config> = {}): Config {
  return {
    port: num(env.PORT, 3000),
    dbPath: env.DB_PATH ?? 'onecup.sqlite',
    publicUrl: (env.PUBLIC_URL ?? 'http://localhost:5173').replace(/\/$/, ''),
    adminKey: env.ADMIN_KEY ?? 'change-me-admin',
    stationSecret: env.STATION_SECRET ?? 'change-me-station-secret',
    stationCodeTtlSec: num(env.STATION_CODE_TTL_SEC, 30),
    studyMode: env.STUDY_MODE === 'on' ? 'on' : 'off',
    cooldownMin: {
      counter: num(env.COOLDOWN_COUNTER_MIN, 2),
      station: num(env.COOLDOWN_STATION_MIN, 10),
      self: num(env.COOLDOWN_SELF_MIN, 60),
    },
    impact: {
      plasticGramsPerCup: num(env.IMPACT_PLASTIC_G, 6.5),
      co2eGramsPerCup: num(env.IMPACT_CO2E_G, 53),
      singleUseCupCo2eGrams: num(env.IMPACT_SINGLE_USE_CO2E_G, 72),
      // ± share used for the low/high band of every impact figure (sensitivity, not a confidence interval)
      uncertainty: num(env.IMPACT_UNCERTAINTY, 0.3),
    },
    dailyGoal: num(env.DAILY_GOAL, 3),
    points: { verified: num(env.POINTS_VERIFIED, 10), self: num(env.POINTS_SELF, 2) },
    cupCostVnd: num(env.CUP_COST_VND, 3000),
    tzOffsetMin: num(env.TZ_OFFSET_MIN, 420),
    league: { groupSize: num(env.LEAGUE_GROUP_SIZE, 30), promote: num(env.LEAGUE_PROMOTE, 5) },
    pilot: {
      start: env.PILOT_START ?? '2027-04-12',
      weeks: num(env.PILOT_WEEKS, 12),
      studyEnd: env.STUDY_END ?? '2027-06-30',
      rewardsEnd: env.REWARDS_END ?? '2027-06-14',
    },
    ...overrides,
  };
}
