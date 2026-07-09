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

    INSERT OR IGNORE INTO settings (id) VALUES (1);
  `);
}
