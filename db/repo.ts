import { and, asc, desc, eq, gte, isNull, lte, or, sql } from 'drizzle-orm';

import { db } from './client';
import {
  adjustments,
  bedtimeRecords,
  children,
  clubPauses,
  clubs,
  pinkyPromises,
  reasons,
  redemptions,
  settings,
  starEvents,
  starGoals,
  starReasons,
  type Child,
  type Club,
  type NewChild,
  type NewClub,
  type Settings,
} from './schema';
import { applyAdjustment, applyOutcome, effectiveBedtime, type Outcome } from '@/lib/bedtime';
import { dateKey } from '@/lib/time';

// ---------- Settings ----------

export function getSettings(): Settings {
  const row = db.select().from(settings).where(eq(settings.id, 1)).get();
  if (row) return row;
  db.insert(settings).values({ id: 1 }).run();
  return db.select().from(settings).where(eq(settings.id, 1)).get()!;
}

export function updateSettings(patch: Partial<Settings>): void {
  db.update(settings).set(patch).where(eq(settings.id, 1)).run();
}

// ---------- Children ----------

export function listChildren(activeOnly = true): Child[] {
  const q = db.select().from(children);
  const rows = activeOnly
    ? q.where(eq(children.active, true)).orderBy(children.sortOrder, children.id).all()
    : q.orderBy(children.sortOrder, children.id).all();
  return rows;
}

export function getChild(id: number): Child | undefined {
  return db.select().from(children).where(eq(children.id, id)).get();
}

export function createChild(data: Omit<NewChild, 'id'>): number {
  const res = db.insert(children).values(data).run();
  return Number(res.lastInsertRowId);
}

export function updateChild(id: number, patch: Partial<NewChild>): void {
  db.update(children).set(patch).where(eq(children.id, id)).run();
}

export function deleteChild(id: number): void {
  db.delete(children).where(eq(children.id, id)).run();
}

// ---------- Reasons ----------

export function listReasons() {
  return db.select().from(reasons).orderBy(reasons.text).all();
}

export function addReason(text: string): number {
  const trimmed = text.trim();
  const existing = db.select().from(reasons).where(eq(reasons.text, trimmed)).get();
  if (existing) return existing.id;
  const res = db.insert(reasons).values({ text: trimmed }).run();
  return Number(res.lastInsertRowId);
}

export function deleteReason(id: number): void {
  db.delete(reasons).where(eq(reasons.id, id)).run();
}

/** How often each reason has been used (optionally for a single child). */
export function reasonStats(childId?: number): { reason: string; count: number }[] {
  const rows = db
    .select({
      reason: reasons.text,
      count: sql<number>`count(${bedtimeRecords.id})`,
    })
    .from(bedtimeRecords)
    .innerJoin(reasons, eq(bedtimeRecords.reasonId, reasons.id))
    .where(
      childId != null
        ? and(eq(bedtimeRecords.outcome, 'bad'), eq(bedtimeRecords.childId, childId))
        : eq(bedtimeRecords.outcome, 'bad'),
    )
    .groupBy(reasons.text)
    .orderBy(desc(sql`count(${bedtimeRecords.id})`))
    .all();
  return rows;
}

// ---------- Assessment ----------

export function getRecordForDate(childId: number, date: string) {
  return db
    .select()
    .from(bedtimeRecords)
    .where(and(eq(bedtimeRecords.childId, childId), eq(bedtimeRecords.date, date)))
    .get();
}

export interface AssessInput {
  childId: number;
  outcome: Outcome;
  nightDate?: Date;
  reasonText?: string;
  note?: string;
}

/**
 * Assess a child's night. Creates (or replaces) the record for that date and
 * updates the child's evolving base bedtime. Re-assessing reverts to the
 * pre-assessment base first, so outcomes never double-apply.
 */
export function assessNight(input: AssessInput): { nextBase: number } {
  const nightDate = input.nightDate ?? new Date();
  const date = dateKey(nightDate);
  const s = getSettings();
  const child = getChild(input.childId);
  if (!child) throw new Error(`Child ${input.childId} not found`);

  const existing = getRecordForDate(input.childId, date);
  const baseBefore = existing ? existing.baseBeforeMinutes : child.baseBedtimeMinutes;
  const scheduled = effectiveBedtime(baseBefore, nightDate, s);
  const nextBase = applyOutcome(baseBefore, input.outcome, s);

  const reasonId =
    input.outcome === 'bad' && input.reasonText?.trim() ? addReason(input.reasonText) : null;

  if (existing) {
    db.update(bedtimeRecords)
      .set({
        scheduledBedtimeMinutes: scheduled,
        baseBeforeMinutes: baseBefore,
        outcome: input.outcome,
        reasonId,
        note: input.note ?? null,
        nextBedtimeMinutes: nextBase,
      })
      .where(eq(bedtimeRecords.id, existing.id))
      .run();
  } else {
    db.insert(bedtimeRecords)
      .values({
        childId: input.childId,
        date,
        scheduledBedtimeMinutes: scheduled,
        baseBeforeMinutes: baseBefore,
        outcome: input.outcome,
        reasonId,
        note: input.note ?? null,
        nextBedtimeMinutes: nextBase,
      })
      .run();
  }

  updateChild(input.childId, { baseBedtimeMinutes: nextBase });
  return { nextBase };
}

/**
 * Revoke a previously good bedtime (e.g. the child got up when they shouldn't
 * have): re-assess that same night as bad.
 */
export function revokeGood(recordId: number, note?: string): void {
  const record = db.select().from(bedtimeRecords).where(eq(bedtimeRecords.id, recordId)).get();
  if (!record) return;
  const s = getSettings();
  const nextBase = applyOutcome(record.baseBeforeMinutes, 'bad', s);
  db.update(bedtimeRecords)
    .set({
      outcome: 'revoked',
      nextBedtimeMinutes: nextBase,
      note: note ?? record.note,
    })
    .where(eq(bedtimeRecords.id, recordId))
    .run();
  updateChild(record.childId, { baseBedtimeMinutes: nextBase });
}

// ---------- Treats / penalties ----------

export function addAdjustment(childId: number, type: 'treat' | 'penalty', note?: string): void {
  const s = getSettings();
  const child = getChild(childId);
  if (!child) return;
  const { next, delta } = applyAdjustment(child.baseBedtimeMinutes, type, s);
  db.insert(adjustments)
    .values({ childId, date: dateKey(), type, deltaMinutes: delta, note: note ?? null })
    .run();
  updateChild(childId, { baseBedtimeMinutes: next });
}

export function listAdjustments(childId: number, limit = 30) {
  return db
    .select()
    .from(adjustments)
    .where(eq(adjustments.childId, childId))
    .orderBy(desc(adjustments.createdAt))
    .limit(limit)
    .all();
}

// ---------- History / graphs ----------

export function listRecords(childId: number, limit = 60) {
  return db
    .select()
    .from(bedtimeRecords)
    .where(eq(bedtimeRecords.childId, childId))
    .orderBy(desc(bedtimeRecords.date))
    .limit(limit)
    .all();
}

/** Recent records (oldest first) for plotting a bedtime-over-time chart. */
export function recordsSince(childId: number, sinceDate: string) {
  return db
    .select()
    .from(bedtimeRecords)
    .where(and(eq(bedtimeRecords.childId, childId), gte(bedtimeRecords.date, sinceDate)))
    .orderBy(bedtimeRecords.date)
    .all();
}

export function streak(childId: number): number {
  const rows = db
    .select({ outcome: bedtimeRecords.outcome })
    .from(bedtimeRecords)
    .where(eq(bedtimeRecords.childId, childId))
    .orderBy(desc(bedtimeRecords.date))
    .all();
  let count = 0;
  for (const r of rows) {
    if (r.outcome === 'good') count += 1;
    else break;
  }
  return count;
}

// ---------- Bedtime pause ----------

/**
 * Suppress bedtime alarms for a child (or all children when childId is null)
 * through the given inclusive date. Pass null for `untilDate` to resume.
 */
export function setBedtimePause(childId: number | null, untilDate: string | null): void {
  const patch = { bedtimePausedUntil: untilDate };
  if (childId == null) {
    db.update(children).set(patch).run();
  } else {
    db.update(children).set(patch).where(eq(children.id, childId)).run();
  }
}

// ---------- Star reasons ----------

export function listStarReasons(kind?: 'good' | 'slip') {
  const q = db.select().from(starReasons);
  return (kind ? q.where(eq(starReasons.kind, kind)) : q).orderBy(starReasons.text).all();
}

/** Insert or update a reason, remembering the star amount last used for it. */
export function upsertStarReason(
  text: string,
  kind: 'good' | 'slip',
  defaultStars: number,
): number {
  const trimmed = text.trim();
  const existing = db.select().from(starReasons).where(eq(starReasons.text, trimmed)).get();
  if (existing) {
    db.update(starReasons).set({ defaultStars, kind }).where(eq(starReasons.id, existing.id)).run();
    return existing.id;
  }
  const res = db.insert(starReasons).values({ text: trimmed, kind, defaultStars }).run();
  return Number(res.lastInsertRowId);
}

export function deleteStarReason(id: number): void {
  db.delete(starReasons).where(eq(starReasons.id, id)).run();
}

// ---------- Star events ----------

export interface StarInput {
  childId: number;
  kind: 'good' | 'slip';
  stars: number; // magnitude (always positive); sign is derived from kind
  reasonText?: string;
  note?: string;
}

/** Record a good deed (+stars) or a slip-up (-stars) for a child. */
export function addStarEvent(input: StarInput): void {
  const magnitude = Math.abs(input.stars);
  const signed = input.kind === 'good' ? magnitude : -magnitude;
  const reasonId = input.reasonText?.trim()
    ? upsertStarReason(input.reasonText, input.kind, magnitude)
    : null;
  db.insert(starEvents)
    .values({
      childId: input.childId,
      date: dateKey(),
      stars: signed,
      kind: input.kind,
      reasonId,
      note: input.note ?? null,
    })
    .run();
}

export function deleteStarEvent(id: number): void {
  db.delete(starEvents).where(eq(starEvents.id, id)).run();
}

export function listStarEvents(childId: number, limit = 60) {
  return db
    .select()
    .from(starEvents)
    .where(eq(starEvents.childId, childId))
    .orderBy(desc(starEvents.createdAt))
    .limit(limit)
    .all();
}

function sumStars(childId: number): number {
  const row = db
    .select({ total: sql<number>`coalesce(sum(${starEvents.stars}), 0)` })
    .from(starEvents)
    .where(eq(starEvents.childId, childId))
    .get();
  return row?.total ?? 0;
}

function sumRedeemed(childId: number): number {
  const row = db
    .select({ total: sql<number>`coalesce(sum(${redemptions.stars}), 0)` })
    .from(redemptions)
    .where(eq(redemptions.childId, childId))
    .get();
  return row?.total ?? 0;
}

export interface StarBalance {
  earned: number; // net of good minus slip
  redeemed: number;
  bank: number; // available to spend
}

/** Current star position for a child: net earned, total redeemed, and bank. */
export function starBalance(childId: number): StarBalance {
  const earned = sumStars(childId);
  const redeemed = sumRedeemed(childId);
  return { earned, redeemed, bank: earned - redeemed };
}

/** Usage counts per star reason (optionally for one child), most used first. */
export function starReasonStats(childId?: number) {
  return db
    .select({
      reason: starReasons.text,
      kind: starReasons.kind,
      count: sql<number>`count(${starEvents.id})`,
      stars: sql<number>`coalesce(sum(${starEvents.stars}), 0)`,
    })
    .from(starEvents)
    .innerJoin(starReasons, eq(starEvents.reasonId, starReasons.id))
    .where(childId != null ? eq(starEvents.childId, childId) : undefined)
    .groupBy(starReasons.text, starReasons.kind)
    .orderBy(desc(sql`count(${starEvents.id})`))
    .all();
}

// ---------- Goals ----------

export function listGoals(activeOnly = false) {
  const q = db.select().from(starGoals);
  return (activeOnly ? q.where(eq(starGoals.active, true)) : q)
    .orderBy(starGoals.starCost, starGoals.sortOrder)
    .all();
}

export function addGoal(name: string, starCost: number, emoji = '🎁'): number {
  const res = db.insert(starGoals).values({ name: name.trim(), starCost, emoji }).run();
  return Number(res.lastInsertRowId);
}

export function updateGoal(
  id: number,
  patch: Partial<{ name: string; starCost: number; emoji: string; active: boolean }>,
): void {
  db.update(starGoals).set(patch).where(eq(starGoals.id, id)).run();
}

export function deleteGoal(id: number): void {
  db.delete(starGoals).where(eq(starGoals.id, id)).run();
}

// ---------- Redemptions ----------

export interface RedeemInput {
  childId: number;
  stars: number; // positive count spent
  goalId?: number | null;
  note?: string;
}

export function addRedemption(input: RedeemInput): void {
  db.insert(redemptions)
    .values({
      childId: input.childId,
      date: dateKey(),
      stars: Math.abs(input.stars),
      goalId: input.goalId ?? null,
      note: input.note ?? null,
    })
    .run();
}

export function deleteRedemption(id: number): void {
  db.delete(redemptions).where(eq(redemptions.id, id)).run();
}

/** Redemption history for a child with the goal name resolved (if any). */
export function listRedemptions(childId: number, limit = 60) {
  return db
    .select({
      id: redemptions.id,
      date: redemptions.date,
      stars: redemptions.stars,
      note: redemptions.note,
      createdAt: redemptions.createdAt,
      goalName: starGoals.name,
      goalEmoji: starGoals.emoji,
    })
    .from(redemptions)
    .leftJoin(starGoals, eq(redemptions.goalId, starGoals.id))
    .where(eq(redemptions.childId, childId))
    .orderBy(desc(redemptions.createdAt))
    .limit(limit)
    .all();
}

// ---------- Clubs ----------

export function listClubs(activeOnly = false): Club[] {
  const q = db.select().from(clubs);
  return (activeOnly ? q.where(eq(clubs.active, true)) : q)
    .orderBy(clubs.weekday, clubs.startMinutes)
    .all();
}

export function getClub(id: number): Club | undefined {
  return db.select().from(clubs).where(eq(clubs.id, id)).get();
}

export function createClub(data: Omit<NewClub, 'id'>): number {
  const res = db.insert(clubs).values(data).run();
  return Number(res.lastInsertRowId);
}

export function updateClub(id: number, patch: Partial<NewClub>): void {
  db.update(clubs).set(patch).where(eq(clubs.id, id)).run();
}

export function deleteClub(id: number): void {
  db.delete(clubs).where(eq(clubs.id, id)).run();
}

// ---------- Club pauses (holidays) ----------

export function listClubPauses() {
  return db.select().from(clubPauses).orderBy(desc(clubPauses.startDate)).all();
}

export function addClubPause(input: {
  clubId?: number | null;
  startDate: string;
  endDate: string;
  note?: string;
}): void {
  db.insert(clubPauses)
    .values({
      clubId: input.clubId ?? null,
      startDate: input.startDate,
      endDate: input.endDate,
      note: input.note ?? null,
    })
    .run();
}

export function deleteClubPause(id: number): void {
  db.delete(clubPauses).where(eq(clubPauses.id, id)).run();
}

/** True if `date` (YYYY-MM-DD) falls in a holiday range muting this club. */
export function isClubMuted(clubId: number, date: string): boolean {
  const row = db
    .select({ id: clubPauses.id })
    .from(clubPauses)
    .where(
      and(
        or(isNull(clubPauses.clubId), eq(clubPauses.clubId, clubId)),
        lte(clubPauses.startDate, date),
        gte(clubPauses.endDate, date),
      ),
    )
    .get();
  return !!row;
}

/** Active clubs occurring on the given date's weekday that are not muted. */
export function clubsForDate(date: Date): Club[] {
  const key = dateKey(date);
  const weekday = date.getDay();
  return db
    .select()
    .from(clubs)
    .where(and(eq(clubs.active, true), eq(clubs.weekday, weekday)))
    .orderBy(asc(clubs.startMinutes))
    .all()
    .filter((c) => !isClubMuted(c.id, key));
}

// ---------- Pinky promises ----------

export function addPromise(childId: number, text: string): number {
  const res = db.insert(pinkyPromises).values({ childId, text: text.trim() }).run();
  return Number(res.lastInsertRowId);
}

export function listPromises(childId: number, limit = 60) {
  return db
    .select()
    .from(pinkyPromises)
    .where(eq(pinkyPromises.childId, childId))
    .orderBy(desc(pinkyPromises.createdAt))
    .limit(limit)
    .all();
}

/** Count of promises still awaiting a kept/broken outcome. */
export function pendingPromiseCount(childId: number): number {
  const row = db
    .select({ n: sql<number>`count(*)` })
    .from(pinkyPromises)
    .where(and(eq(pinkyPromises.childId, childId), isNull(pinkyPromises.kept)))
    .get();
  return row?.n ?? 0;
}

export function setPromiseKept(id: number, kept: boolean | null): void {
  db.update(pinkyPromises).set({ kept }).where(eq(pinkyPromises.id, id)).run();
}

export function deletePromise(id: number): void {
  db.delete(pinkyPromises).where(eq(pinkyPromises.id, id)).run();
}
