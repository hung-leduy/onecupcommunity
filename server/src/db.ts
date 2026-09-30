import { DatabaseSync } from 'node:sqlite';

export type DB = DatabaseSync;

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id                  TEXT PRIMARY KEY,
  token               TEXT NOT NULL UNIQUE,
  nickname            TEXT NOT NULL,
  arm                 TEXT NOT NULL,           -- experimental arm (H2)
  preferred_method    TEXT,                    -- 'nfc' | 'qr' | NULL (H3 comparison)
  consent_participate INTEGER NOT NULL,
  consent_research    INTEGER NOT NULL,        -- may the data enter the published dataset?
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
`;

export function openDb(path: string): DB {
  const db = new DatabaseSync(path);
  db.exec(SCHEMA);
  return db;
}
