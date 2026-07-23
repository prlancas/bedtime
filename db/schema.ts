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
  // Built-in sound key ('warning' | 'bedtime' | ...) OR the sentinel 'custom'.
  warningSound: text('warning_sound').notNull().default('warning'),
  bedtimeSound: text('bedtime_sound').notNull().default('bedtime'),
  // When warningSound/bedtimeSound === 'custom', these hold a file:// URI to a
  // recorded/uploaded clip played by the in-app alarm screen.
  warningSoundUri: text('warning_sound_uri'),
  bedtimeSoundUri: text('bedtime_sound_uri'),
  // Bedtime alarms are suppressed on/before this local date (YYYY-MM-DD) when set.
  bedtimePausedUntil: text('bedtime_paused_until'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
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
  // Star economy.
  pencePerStar: integer('pence_per_star').notNull().default(5), // monetary value of 1 star
  starGoodDefault: integer('star_good_default').notNull().default(1), // default stars for a good deed
  starSlipDefault: integer('star_slip_default').notNull().default(1), // default stars removed for a slip-up
  currencySymbol: text('currency_symbol').notNull().default('£'),
  // Optional features (keep the interface simple by turning off what you don't use).
  featurePinkyPromises: integer('feature_pinky_promises', { mode: 'boolean' })
    .notNull()
    .default(true),
  featureShop: integer('feature_shop', { mode: 'boolean' }).notNull().default(true),
  featureHomeShortcuts: integer('feature_home_shortcuts', { mode: 'boolean' })
    .notNull()
    .default(false),
  featureDoTheSame: integer('feature_do_the_same', { mode: 'boolean' }).notNull().default(true),
  tourSeen: integer('tour_seen', { mode: 'boolean' }).notNull().default(false),
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
  createdAt: integer('created_at')
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

/** Reusable reasons for a bad bedtime (e.g. "hiding", "moaning and shouting"). */
export const reasons = sqliteTable('reasons', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  text: text('text').notNull().unique(),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
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
  createdAt: integer('created_at')
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

/**
 * Reusable reasons for awarding or removing stars, e.g. "tidied room" (good) or
 * "hit sibling" (slip). `defaultStars` remembers the last amount used so it can
 * be pre-filled next time (and still overridden).
 */
export const starReasons = sqliteTable('star_reasons', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  text: text('text').notNull().unique(),
  kind: text('kind', { enum: ['good', 'slip'] })
    .notNull()
    .default('good'),
  defaultStars: integer('default_stars').notNull().default(1),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

/**
 * A star transaction for a child. `stars` is signed: positive for good deeds,
 * negative for slip-ups. Redemptions are stored separately (see redemptions).
 */
export const starEvents = sqliteTable('star_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  childId: integer('child_id')
    .notNull()
    .references(() => children.id, { onDelete: 'cascade' }),
  date: text('date').notNull(), // YYYY-MM-DD
  stars: integer('stars').notNull(), // signed
  kind: text('kind', { enum: ['good', 'slip'] }).notNull(),
  reasonId: integer('reason_id').references(() => starReasons.id),
  note: text('note'),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

/** Configurable rewards a child can save up for, e.g. "Ice cream" = 20 stars. */
export const starGoals = sqliteTable('star_goals', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  starCost: integer('star_cost').notNull(),
  emoji: text('emoji').notNull().default('🎁'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

/** A record of stars spent by a child, optionally against a configured goal. */
export const redemptions = sqliteTable('redemptions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  childId: integer('child_id')
    .notNull()
    .references(() => children.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  stars: integer('stars').notNull(), // positive count of stars spent
  goalId: integer('goal_id').references(() => starGoals.id),
  note: text('note'), // free-text description of what was redeemed
  createdAt: integer('created_at')
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

/**
 * A recurring weekly activity/club, e.g. "Beavers" every Wednesday at 17:15.
 * `childId` null means it applies to all children. Warnings work like bedtime.
 */
export const clubs = sqliteTable('clubs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  childId: integer('child_id').references(() => children.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  weekday: integer('weekday').notNull(), // 0=Sun .. 6=Sat (JS getDay)
  startMinutes: integer('start_minutes').notNull(), // minutes from midnight
  durationMinutes: integer('duration_minutes').notNull().default(60),
  warningLeadMinutes: integer('warning_lead_minutes').notNull().default(30),
  color: text('color').notNull().default('#38BDF8'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

/**
 * A holiday / date range during which clubs are muted (no alarms, shown as
 * skipped on the planner). `clubId` null mutes all clubs for the range.
 */
export const clubPauses = sqliteTable('club_pauses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  clubId: integer('club_id').references(() => clubs.id, { onDelete: 'cascade' }),
  startDate: text('start_date').notNull(), // YYYY-MM-DD inclusive
  endDate: text('end_date').notNull(), // YYYY-MM-DD inclusive
  note: text('note'),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

/**
 * A pinky promise made with a child, e.g. "had a treat now — promise not to
 * moan about swimming next week". Logged so you can remind them later; `kept`
 * is null until you mark it kept (true) or broken (false).
 */
export const pinkyPromises = sqliteTable('pinky_promises', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  childId: integer('child_id')
    .notNull()
    .references(() => children.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  kept: integer('kept', { mode: 'boolean' }),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export type Child = typeof children.$inferSelect;
export type NewChild = typeof children.$inferInsert;
export type Settings = typeof settings.$inferSelect;
export type BedtimeRecord = typeof bedtimeRecords.$inferSelect;
export type Reason = typeof reasons.$inferSelect;
export type Adjustment = typeof adjustments.$inferSelect;
export type StarReason = typeof starReasons.$inferSelect;
export type StarEvent = typeof starEvents.$inferSelect;
export type StarGoal = typeof starGoals.$inferSelect;
export type Redemption = typeof redemptions.$inferSelect;
export type Club = typeof clubs.$inferSelect;
export type NewClub = typeof clubs.$inferInsert;
export type ClubPause = typeof clubPauses.$inferSelect;
export type PinkyPromise = typeof pinkyPromises.$inferSelect;
