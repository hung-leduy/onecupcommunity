// Runtime configuration. All values can be overridden by environment variables.
export type Config = {
  port: number;
  dbPath: string;
  /** Public base URL encoded into cup QR codes and NFC NDEF records. */
  publicUrl: string;
  /** Key for /api/admin endpoints (sent as the X-Admin-Key header). */
  adminKey: string;
  /** Secret used to derive the rotating station codes (tier 2 scans). */
  stationSecret: string;
  /** Lifetime of one rotating station code, in seconds. */
  stationCodeTtlSec: number;
  /** "on" = randomised feature arms are enforced; "off" = everyone sees every feature. */
  studyMode: 'on' | 'off';
  /** Minimum gap between two counted scans of the same cup, per tier (minutes). */
  cooldownMin: { counter: number; station: number; self: number };
  /**
   * Impact coefficients per avoided single-use cup.
   * PLACEHOLDERS — replace with the values chosen from the LCA literature (e.g. Lee et al., 2025)
   * before any figure is reported.
   */
  impact: { plasticGramsPerCup: number; co2eGramsPerCup: number };
};

const env = process.env;

export function loadConfig(overrides: Partial<Config> = {}): Config {
  return {
    port: Number(env.PORT ?? 3000),
    dbPath: env.DB_PATH ?? 'onecup.sqlite',
    publicUrl: (env.PUBLIC_URL ?? 'http://localhost:5173').replace(/\/$/, ''),
    adminKey: env.ADMIN_KEY ?? 'change-me-admin',
    stationSecret: env.STATION_SECRET ?? 'change-me-station-secret',
    stationCodeTtlSec: Number(env.STATION_CODE_TTL_SEC ?? 30),
    studyMode: env.STUDY_MODE === 'on' ? 'on' : 'off',
    cooldownMin: {
      counter: Number(env.COOLDOWN_COUNTER_MIN ?? 2),
      station: Number(env.COOLDOWN_STATION_MIN ?? 10),
      self: Number(env.COOLDOWN_SELF_MIN ?? 60),
    },
    impact: {
      plasticGramsPerCup: Number(env.IMPACT_PLASTIC_G ?? 12),
      co2eGramsPerCup: Number(env.IMPACT_CO2E_G ?? 50),
    },
    ...overrides,
  };
}
