import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * A child tracked by the app. `baseBedtimeMinutes` is the evolving school-night
 * bedtime (minutes from midnight). The effective bedtime for a given night is
 * the base plus any weekend offset (see lib/bedtime.ts).
 */
export const children = sqliteTable('children', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  photoUri: text('photo_uri'),
  color: text('color').notNull().default('#7A82F5'),
  baseBedtimeMinutes: integer('base_bedtime_minutes').notNull().default(1170), // 19:30
  warningLeadMinutes: integer('warning_lead_minutes').notNull().default(10),
  warningSound: text('warning_sound').notNull().default('warning'),
  bedtimeSound: text('bedtime_sound').notNull().default('bedtime'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch() * 1000)`),
});

/** Single-row (id = 1) global configuration. */
export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey(),
  goodDeltaMinutes: integer('good_delta_minutes').notNull().default(10), // y: later after a good night
  badDeltaMinutes: integer('bad_delta_minutes').notNull().default(15), // x: earlier after a bad night
  fridayOffsetMinutes: integer('friday_offset_minutes').notNull().default(30),
  saturdayOffsetMinutes: integer('saturday_offset_minutes').notNull().default(30),
  minBedtimeMinutes: integer('min_bedtime_minutes').notNull().default(1110), // 18:30
  maxBedtimeMinutes: integer('max_bedtime_minutes').notNull().default(1290), // 21:30
  pinEnabled: integer('pin_enabled', { mode: 'boolean' }).notNull().default(false),
  pinHash: text('pin_hash'),
});

/** One record per assessed night, per child. Powers history + graphs. */
export const bedtimeRecords = sqliteTable('bedtime_records', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  childId: integer('child_id')
    .notNull()
    .references(() => children.id, { onDelete: 'cascade' }),
  date: text('date').notNull(), // YYYY-MM-DD of the night
  scheduledBedtimeMinutes: integer('scheduled_bedtime_minutes').notNull(),
  baseBeforeMinutes: integer('base_before_minutes').notNull(),
  outcome: text('outcome', { enum: ['good', 'bad', 'revoked'] }).notNull(),
  reasonId: integer('reason_id').references(() => reasons.id),
  note: text('note'),
  nextBedtimeMinutes: integer('next_bedtime_minutes').notNull(),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch() * 1000)`),
});

/** Reusable reasons for a bad bedtime (e.g. "hiding", "moaning and shouting"). */
export const reasons = sqliteTable('reasons', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  text: text('text').notNull().unique(),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch() * 1000)`),
});

/** Manual treats (later) / penalties (earlier) for behaviour outside bedtime. */
export const adjustments = sqliteTable('adjustments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  childId: integer('child_id')
    .notNull()
    .references(() => children.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  type: text('type', { enum: ['treat', 'penalty'] }).notNull(),
  deltaMinutes: integer('delta_minutes').notNull(), // signed: + later, - earlier
  note: text('note'),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch() * 1000)`),
});

export type Child = typeof children.$inferSelect;
export type NewChild = typeof children.$inferInsert;
export type Settings = typeof settings.$inferSelect;
export type BedtimeRecord = typeof bedtimeRecords.$inferSelect;
export type Reason = typeof reasons.$inferSelect;
export type Adjustment = typeof adjustments.$inferSelect;
