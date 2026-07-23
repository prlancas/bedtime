import { describe, expect, it } from '@jest/globals';

import {
  addDays,
  clamp,
  dateAtMinutes,
  dateFromKey,
  dateKey,
  formatDate,
  formatTime,
  isWeekendNight,
  minutesFromDate,
  weekdayLabel,
} from '@/lib/time';
import { countdownLabel } from '@/lib/useNow';

// July 2026: 8th = Wed, 10th = Fri, 11th = Sat, 12th = Sun
const WED = new Date(2026, 6, 8, 12, 0);
const FRI = new Date(2026, 6, 10, 12, 0);
const SAT = new Date(2026, 6, 11, 12, 0);

describe('clamp', () => {
  it('bounds values', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(20, 0, 10)).toBe(10);
  });
});

describe('formatTime', () => {
  it('formats minutes-from-midnight as 12h labels', () => {
    expect(formatTime(0)).toBe('12:00 AM');
    expect(formatTime(720)).toBe('12:00 PM');
    expect(formatTime(1170)).toBe('7:30 PM');
    expect(formatTime(1290)).toBe('9:30 PM');
  });

  it('wraps values outside a single day', () => {
    expect(formatTime(-30)).toBe('11:30 PM');
    expect(formatTime(1440)).toBe('12:00 AM');
  });
});

describe('isWeekendNight', () => {
  it('treats Friday and Saturday as weekend nights', () => {
    expect(isWeekendNight(FRI)).toBe(true);
    expect(isWeekendNight(SAT)).toBe(true);
    expect(isWeekendNight(WED)).toBe(false);
  });
});

describe('date helpers', () => {
  it('builds a local YYYY-MM-DD key', () => {
    expect(dateKey(FRI)).toBe('2026-07-10');
  });

  it('adds days', () => {
    expect(dateKey(addDays(FRI, -2))).toBe('2026-07-08');
    expect(dateKey(addDays(FRI, 1))).toBe('2026-07-11');
  });

  it('converts between minutes and dates', () => {
    const d = dateAtMinutes(1170, FRI);
    expect(d.getHours()).toBe(19);
    expect(d.getMinutes()).toBe(30);
    expect(minutesFromDate(d)).toBe(1170);
  });

  it('labels weekdays', () => {
    expect(weekdayLabel(WED)).toBe('Wed');
    expect(weekdayLabel(FRI)).toBe('Fri');
    expect(weekdayLabel(SAT)).toBe('Sat');
  });

  it('formats a friendly date', () => {
    expect(formatDate(FRI)).toBe('Fri 10 Jul');
    expect(formatDate(WED)).toBe('Wed 8 Jul');
  });

  it('parses a YYYY-MM-DD key back into a local date', () => {
    const d = dateFromKey('2026-07-10');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6);
    expect(d.getDate()).toBe(10);
    expect(dateKey(d)).toBe('2026-07-10');
  });
});

describe('countdownLabel', () => {
  const now = new Date(2026, 6, 10, 19, 0); // 19:00 -> 1140 minutes
  it('formats future times', () => {
    expect(countdownLabel(1200, now)).toBe('in 1h 0m');
    expect(countdownLabel(1145, now)).toBe('in 5m');
  });
  it('reports "now" around the target', () => {
    expect(countdownLabel(1140, now)).toBe('now');
    expect(countdownLabel(1130, now)).toBe('now');
  });
  it('rolls far-past times to tomorrow', () => {
    expect(countdownLabel(1000, now)).toBe('in 21h 40m');
  });
});
