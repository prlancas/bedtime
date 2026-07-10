import { describe, expect, it } from '@jest/globals';

import {
  applyAdjustment,
  applyOutcome,
  effectiveBedtime,
  outcomeMessage,
  weekendOffsetForDate,
} from '@/lib/bedtime';

const settings = {
  goodDeltaMinutes: 10,
  badDeltaMinutes: 15,
  fridayOffsetMinutes: 30,
  saturdayOffsetMinutes: 45,
  minBedtimeMinutes: 1110, // 18:30
  maxBedtimeMinutes: 1290, // 21:30
};

const WED = new Date(2026, 6, 8, 12, 0);
const FRI = new Date(2026, 6, 10, 12, 0);
const SAT = new Date(2026, 6, 11, 12, 0);

describe('weekendOffsetForDate', () => {
  it('applies per-day weekend offsets', () => {
    expect(weekendOffsetForDate(WED, settings)).toBe(0);
    expect(weekendOffsetForDate(FRI, settings)).toBe(30);
    expect(weekendOffsetForDate(SAT, settings)).toBe(45);
  });
});

describe('effectiveBedtime', () => {
  it('returns the base on school nights', () => {
    expect(effectiveBedtime(1170, WED, settings)).toBe(1170);
  });

  it('adds the weekend offset on Fri/Sat', () => {
    expect(effectiveBedtime(1170, FRI, settings)).toBe(1200);
    expect(effectiveBedtime(1170, SAT, settings)).toBe(1215);
  });

  it('clamps the base to the window before offsetting', () => {
    expect(effectiveBedtime(900, WED, settings)).toBe(1110); // below min
    expect(effectiveBedtime(1400, WED, settings)).toBe(1290); // above max
    // Weekend offset can go past the normal max.
    expect(effectiveBedtime(1290, FRI, settings)).toBe(1320);
  });
});

describe('applyOutcome', () => {
  it('moves later on a good night, earlier on a bad night', () => {
    expect(applyOutcome(1170, 'good', settings)).toBe(1180);
    expect(applyOutcome(1170, 'bad', settings)).toBe(1155);
    expect(applyOutcome(1170, 'revoked', settings)).toBe(1155);
  });

  it('clamps to the bedtime window', () => {
    expect(applyOutcome(1285, 'good', settings)).toBe(1290);
    expect(applyOutcome(1115, 'bad', settings)).toBe(1110);
  });
});

describe('applyAdjustment', () => {
  it('treats add a good delta, penalties subtract a bad delta', () => {
    expect(applyAdjustment(1170, 'treat', settings)).toEqual({ next: 1180, delta: 10 });
    expect(applyAdjustment(1170, 'penalty', settings)).toEqual({ next: 1155, delta: -15 });
  });

  it('reports the real (clamped) delta at the boundaries', () => {
    expect(applyAdjustment(1290, 'treat', settings)).toEqual({ next: 1290, delta: 0 });
    expect(applyAdjustment(1110, 'penalty', settings)).toEqual({ next: 1110, delta: 0 });
  });
});

describe('outcomeMessage', () => {
  it('describes good nights', () => {
    expect(outcomeMessage('good', 10)).toContain('10 min later');
    expect(outcomeMessage('good', 0)).toContain('latest bedtime');
  });

  it('describes bad nights', () => {
    expect(outcomeMessage('bad', -15)).toContain('15 min earlier');
    expect(outcomeMessage('bad', 0)).toContain('earliest bedtime');
  });
});
