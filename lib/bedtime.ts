import type { Settings } from '@/db/schema';
import { clamp, isWeekendNight } from '@/lib/time';

export type Outcome = 'good' | 'bad' | 'revoked';

/**
 * The weekend offset applied to a given night. Friday and Saturday nights are
 * treated as non-school nights, so kids may stay up later.
 */
export function weekendOffsetForDate(
  date: Date,
  settings: Pick<Settings, 'fridayOffsetMinutes' | 'saturdayOffsetMinutes'>,
): number {
  const day = date.getDay();
  if (day === 5) return settings.fridayOffsetMinutes;
  if (day === 6) return settings.saturdayOffsetMinutes;
  return 0;
}

/**
 * The actual bedtime for a specific night: the evolving base bedtime plus any
 * weekend offset for that night. The base is clamped to the configured window;
 * the weekend offset can push later than the normal maximum.
 */
export function effectiveBedtime(
  baseBedtimeMinutes: number,
  date: Date,
  settings: Pick<
    Settings,
    'minBedtimeMinutes' | 'maxBedtimeMinutes' | 'fridayOffsetMinutes' | 'saturdayOffsetMinutes'
  >,
): number {
  const base = clamp(baseBedtimeMinutes, settings.minBedtimeMinutes, settings.maxBedtimeMinutes);
  return base + (isWeekendNight(date) ? weekendOffsetForDate(date, settings) : 0);
}

/**
 * Given a base bedtime and a night's outcome, compute the next base bedtime.
 * Good -> later by goodDelta (y). Bad/revoked -> earlier by badDelta (x).
 * Result is clamped to [min, max].
 */
export function applyOutcome(
  baseBedtimeMinutes: number,
  outcome: Outcome,
  settings: Pick<
    Settings,
    'goodDeltaMinutes' | 'badDeltaMinutes' | 'minBedtimeMinutes' | 'maxBedtimeMinutes'
  >,
): number {
  const delta = outcome === 'good' ? settings.goodDeltaMinutes : -settings.badDeltaMinutes;
  return clamp(baseBedtimeMinutes + delta, settings.minBedtimeMinutes, settings.maxBedtimeMinutes);
}

/** Apply a manual treat (+goodDelta) or penalty (-badDelta), clamped. */
export function applyAdjustment(
  baseBedtimeMinutes: number,
  type: 'treat' | 'penalty',
  settings: Pick<
    Settings,
    'goodDeltaMinutes' | 'badDeltaMinutes' | 'minBedtimeMinutes' | 'maxBedtimeMinutes'
  >,
): { next: number; delta: number } {
  const delta = type === 'treat' ? settings.goodDeltaMinutes : -settings.badDeltaMinutes;
  const next = clamp(
    baseBedtimeMinutes + delta,
    settings.minBedtimeMinutes,
    settings.maxBedtimeMinutes,
  );
  return { next, delta: next - baseBedtimeMinutes };
}

/** A friendly, kid-facing message describing what happens after an outcome. */
export function outcomeMessage(outcome: Outcome, deltaMinutes: number): string {
  if (outcome === 'good') {
    return deltaMinutes > 0
      ? `Great job! Bedtime moves ${deltaMinutes} min later tomorrow.`
      : `Great job! You're already at the latest bedtime.`;
  }
  const earlier = Math.abs(deltaMinutes);
  return earlier > 0
    ? `Looks like someone's tired and grumpy \u2014 bed ${earlier} min earlier tomorrow for more sleep.`
    : `You're already at the earliest bedtime.`;
}
