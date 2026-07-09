import { and, desc, eq, gte, sql } from 'drizzle-orm';

import { db } from './client';
import {
  adjustments,
  bedtimeRecords,
  children,
  reasons,
  settings,
  type Child,
  type NewChild,
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
