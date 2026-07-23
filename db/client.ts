import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';

export const DB_NAME = 'bedtime.db';

const expoDb = openDatabaseSync(DB_NAME, { enableChangeListener: true });

export const db = drizzle(expoDb, { schema });

/**
 * Create tables if they do not exist and seed the single settings row.
 * Idempotent: safe to run on every launch. We manage the schema here rather
 * than via bundled Drizzle migrations to keep startup simple and reliable.
 */
export function initDatabase(): void {
  expoDb.execSync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS children (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      photo_uri TEXT,
      color TEXT NOT NULL DEFAULT '#7A82F5',
      base_bedtime_minutes INTEGER NOT NULL DEFAULT 1170,
      warning_lead_minutes INTEGER NOT NULL DEFAULT 10,
      warning_sound TEXT NOT NULL DEFAULT 'warning',
      bedtime_sound TEXT NOT NULL DEFAULT 'bedtime',
      active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY,
      good_delta_minutes INTEGER NOT NULL DEFAULT 10,
      bad_delta_minutes INTEGER NOT NULL DEFAULT 15,
      friday_offset_minutes INTEGER NOT NULL DEFAULT 30,
      saturday_offset_minutes INTEGER NOT NULL DEFAULT 30,
      min_bedtime_minutes INTEGER NOT NULL DEFAULT 1110,
      max_bedtime_minutes INTEGER NOT NULL DEFAULT 1290,
      pin_enabled INTEGER NOT NULL DEFAULT 0,
      pin_hash TEXT
    );

    CREATE TABLE IF NOT EXISTS reasons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS bedtime_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      scheduled_bedtime_minutes INTEGER NOT NULL,
      base_before_minutes INTEGER NOT NULL,
      outcome TEXT NOT NULL,
      reason_id INTEGER REFERENCES reasons(id),
      note TEXT,
      next_bedtime_minutes INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS adjustments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      delta_minutes INTEGER NOT NULL,
      note TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS star_reasons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL UNIQUE,
      kind TEXT NOT NULL DEFAULT 'good',
      default_stars INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS star_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      stars INTEGER NOT NULL,
      kind TEXT NOT NULL,
      reason_id INTEGER REFERENCES star_reasons(id),
      note TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS star_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      star_cost INTEGER NOT NULL,
      emoji TEXT NOT NULL DEFAULT '🎁',
      active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS redemptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      stars INTEGER NOT NULL,
      goal_id INTEGER REFERENCES star_goals(id),
      note TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS clubs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      child_id INTEGER REFERENCES children(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      weekday INTEGER NOT NULL,
      start_minutes INTEGER NOT NULL,
      duration_minutes INTEGER NOT NULL DEFAULT 60,
      warning_lead_minutes INTEGER NOT NULL DEFAULT 30,
      color TEXT NOT NULL DEFAULT '#38BDF8',
      active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS club_pauses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      club_id INTEGER REFERENCES clubs(id) ON DELETE CASCADE,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      note TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS pinky_promises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      kept INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    INSERT OR IGNORE INTO settings (id) VALUES (1);
  `);

  migrate();
}

/**
 * Add columns introduced after the initial release. SQLite has no
 * "ADD COLUMN IF NOT EXISTS", so we check PRAGMA table_info first. Each entry is
 * idempotent and safe to run on every launch.
 */
function migrate(): void {
  const additions: { table: string; column: string; def: string }[] = [
    { table: 'children', column: 'warning_sound_uri', def: 'TEXT' },
    { table: 'children', column: 'bedtime_sound_uri', def: 'TEXT' },
    { table: 'children', column: 'bedtime_paused_until', def: 'TEXT' },
    { table: 'settings', column: 'pence_per_star', def: 'INTEGER NOT NULL DEFAULT 5' },
    { table: 'settings', column: 'star_good_default', def: 'INTEGER NOT NULL DEFAULT 1' },
    { table: 'settings', column: 'star_slip_default', def: 'INTEGER NOT NULL DEFAULT 1' },
    { table: 'settings', column: 'currency_symbol', def: "TEXT NOT NULL DEFAULT '£'" },
    { table: 'settings', column: 'feature_pinky_promises', def: 'INTEGER NOT NULL DEFAULT 1' },
    { table: 'settings', column: 'feature_shop', def: 'INTEGER NOT NULL DEFAULT 1' },
    { table: 'settings', column: 'feature_home_shortcuts', def: 'INTEGER NOT NULL DEFAULT 0' },
    { table: 'settings', column: 'feature_do_the_same', def: 'INTEGER NOT NULL DEFAULT 1' },
    { table: 'settings', column: 'tour_seen', def: 'INTEGER NOT NULL DEFAULT 0' },
  ];

  for (const { table, column, def } of additions) {
    const cols = expoDb.getAllSync<{ name: string }>(`PRAGMA table_info(${table});`);
    if (!cols.some((c) => c.name === column)) {
      expoDb.execSync(`ALTER TABLE ${table} ADD COLUMN ${column} ${def};`);
    }
  }
}
