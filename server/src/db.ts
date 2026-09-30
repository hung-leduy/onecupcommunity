import { DatabaseSync } from 'node:sqlite';

export type DB = DatabaseSync;

// Schema changes are applied in order and recorded in PRAGMA user_version,
// so a database created by an earlier version of the app is upgraded in place.
const MIGRATIONS: string[] = [
  // 1 — first MVP
  `
  CREATE TABLE IF NOT EXISTS users (
    id                  TEXT PRIMARY KEY,
    token               TEXT NOT NULL UNIQUE,
    nickname            TEXT NOT NULL,
    arm                 TEXT NOT NULL,           -- experimental arm (H2)
    preferred_method    TEXT,                    -- 'nfc' | 'qr' | NULL (H3 comparison)
    consent_participate INTEGER NOT NULL,
    consent_research    INTEGER NOT NULL,        -- may the data enter the research analysis?
    created_at          TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS vendors (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    pin          TEXT NOT NULL UNIQUE,
    token        TEXT NOT NULL UNIQUE,
    discount_vnd INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT NOT NULL
  );

  -- A cup is a physical carrier: a QR-engraved VGU cup or an NFC tag stuck on a personal bottle.
  CREATE TABLE IF NOT EXISTS cups (
    id         TEXT PRIMARY KEY,
    kind       TEXT NOT NULL,                    -- 'qr' | 'nfc'
    code       TEXT NOT NULL UNIQUE,             -- printed / claim code, also in the QR or NDEF URL
    nfc_uid    TEXT UNIQUE,                      -- normalised hex UID for NFC tags
    user_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
    linked_at  TEXT,
    created_at TEXT NOT NULL
  );

  -- One row per reuse event. Tier: 1 = counter (verified), 2 = station code (verified), 3 = self-scan (unverified).
  CREATE TABLE IF NOT EXISTS scans (
    id             TEXT PRIMARY KEY,
    cup_id         TEXT NOT NULL REFERENCES cups(id) ON DELETE CASCADE,
    user_id        TEXT REFERENCES users(id) ON DELETE CASCADE,
    vendor_id      TEXT REFERENCES vendors(id),
    tier           INTEGER NOT NULL,
    verified       INTEGER NOT NULL,
    method         TEXT NOT NULL,                -- 'qr' | 'nfc'
    source         TEXT NOT NULL,                -- camera | webnfc | usb-hid | pcsc-bridge | manual | station | self
    tx_duration_ms INTEGER,                      -- counter transaction time, when the terminal timer was used
    discount_vnd   INTEGER NOT NULL DEFAULT 0,
    created_at     TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS scans_cup_time ON scans(cup_id, created_at);
  CREATE INDEX IF NOT EXISTS scans_user ON scans(user_id);
  `,
  // 2 — designs v2: profile, cumulative arms, points, clusters, vendor days, flags, rewards, leagues
  `
  ALTER TABLE users ADD COLUMN faculty TEXT;
  ALTER TABLE users ADD COLUMN intake TEXT;
  ALTER TABLE users ADD COLUMN consent_open_data INTEGER NOT NULL DEFAULT 0;
  UPDATE users SET arm = 'gamification' WHERE arm = 'feedback_gamification';
  UPDATE users SET arm = 'rewards' WHERE arm = 'gamification_rewards';

  ALTER TABLE scans ADD COLUMN points INTEGER NOT NULL DEFAULT 0;
  CREATE INDEX scans_time ON scans(created_at);
  CREATE INDEX scans_vendor_time ON scans(vendor_id, created_at);

  ALTER TABLE vendors ADD COLUMN cluster TEXT NOT NULL DEFAULT 'A';   -- stepped-wedge cluster
  ALTER TABLE vendors ADD COLUMN station_label TEXT;                 -- e.g. "Trạm 1"

  CREATE TABLE settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  -- Daily counts entered by the outlet: all drinks served (denominator of the reuse share) and,
  -- before the outlet joins the intervention, reusable cups counted by observation.
  CREATE TABLE vendor_days (
    vendor_id         TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    day               TEXT NOT NULL,
    drinks_total      INTEGER,
    reusable_observed INTEGER,
    updated_at        TEXT NOT NULL,
    PRIMARY KEY (vendor_id, day)
  );

  -- Scans that were not counted (same cup inside the cooldown window), kept for data-quality review.
  CREATE TABLE scan_flags (
    id         TEXT PRIMARY KEY,
    cup_id     TEXT REFERENCES cups(id) ON DELETE CASCADE,
    user_id    TEXT REFERENCES users(id) ON DELETE CASCADE,
    vendor_id  TEXT REFERENCES vendors(id),
    tier       INTEGER NOT NULL,
    reason     TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX scan_flags_time ON scan_flags(created_at);

  CREATE TABLE rewards (
    id          TEXT PRIMARY KEY,
    title_vi    TEXT NOT NULL,
    title_en    TEXT NOT NULL,
    cost_points INTEGER NOT NULL,
    vendor_id   TEXT REFERENCES vendors(id) ON DELETE SET NULL,
    active      INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL
  );

  CREATE TABLE redemptions (
    id             TEXT PRIMARY KEY,
    user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reward_id      TEXT NOT NULL REFERENCES rewards(id),
    cost_points    INTEGER NOT NULL,
    voucher        TEXT NOT NULL UNIQUE,
    status         TEXT NOT NULL,              -- 'issued' | 'used'
    used_vendor_id TEXT REFERENCES vendors(id),
    created_at     TEXT NOT NULL,
    used_at        TEXT
  );

  -- Weekly leagues: members of a week, their tier (0 = Green, 1 = Gold, 2 = Diamond) and group.
  CREATE TABLE league_members (
    week     TEXT NOT NULL,                    -- local date of the Monday
    user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tier     INTEGER NOT NULL,
    group_no INTEGER NOT NULL,
    PRIMARY KEY (week, user_id)
  );
  `,
];

export function openDb(path: string): DB {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  migrate(db);
  return db;
}

export function migrate(db: DB) {
  const current = Number((db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version);
  for (let v = current; v < MIGRATIONS.length; v++) {
    db.exec('BEGIN');
    try {
      db.exec(MIGRATIONS[v]);
      db.exec(`PRAGMA user_version = ${v + 1}`);
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }
}
