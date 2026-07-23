import { describe, expect, it } from '@jest/globals';

import { isBedtimePaused } from '@/lib/bedtime';
import {
  affordableGoals,
  formatMoney,
  nextGoal,
  starMoney,
  starsToPence,
  type GoalLike,
} from '@/lib/stars';

const GOALS: GoalLike[] = [
  { id: 1, name: 'Ice cream', emoji: '🍦', starCost: 20 },
  { id: 2, name: 'Toy', emoji: '🧸', starCost: 100 },
  { id: 3, name: 'Comic', emoji: '📚', starCost: 50 },
];

describe('starsToPence', () => {
  it('multiplies by the rate', () => {
    expect(starsToPence(10, 5)).toBe(50);
    expect(starsToPence(0, 5)).toBe(0);
  });
});

describe('formatMoney', () => {
  it('shows pence under a pound', () => {
    expect(formatMoney(5)).toBe('5p');
    expect(formatMoney(99)).toBe('99p');
  });

  it('shows pounds at or above 100p', () => {
    expect(formatMoney(100)).toBe('£1.00');
    expect(formatMoney(125)).toBe('£1.25');
    expect(formatMoney(500, '$')).toBe('$5.00');
  });

  it('handles negatives', () => {
    expect(formatMoney(-50)).toBe('-50p');
    expect(formatMoney(-150)).toBe('-£1.50');
  });
});

describe('starMoney', () => {
  it('formats a star balance as money', () => {
    expect(starMoney(30, 5)).toBe('£1.50');
    expect(starMoney(4, 5)).toBe('20p');
  });
});

describe('nextGoal', () => {
  it('returns the cheapest goal not yet affordable', () => {
    const g = nextGoal(25, GOALS);
    expect(g?.goal.name).toBe('Comic');
    expect(g?.remaining).toBe(25);
  });

  it('reports progress fraction', () => {
    const g = nextGoal(10, GOALS);
    expect(g?.goal.name).toBe('Ice cream');
    expect(g?.fraction).toBeCloseTo(0.5);
  });

  it('returns null when everything is affordable', () => {
    expect(nextGoal(200, GOALS)).toBeNull();
  });

  it('returns null with no goals', () => {
    expect(nextGoal(10, [])).toBeNull();
  });
});

describe('affordableGoals', () => {
  it('lists affordable goals, most expensive first', () => {
    const list = affordableGoals(60, GOALS);
    expect(list.map((g) => g.name)).toEqual(['Comic', 'Ice cream']);
  });
});

describe('isBedtimePaused', () => {
  const night = new Date(2026, 6, 10, 19, 30); // Fri 10 Jul 2026

  it('is not paused when unset', () => {
    expect(isBedtimePaused(null, night)).toBe(false);
    expect(isBedtimePaused(undefined, night)).toBe(false);
  });

  it('is paused on or before the until date', () => {
    expect(isBedtimePaused('2026-07-10', night)).toBe(true); // same night
    expect(isBedtimePaused('2026-07-15', night)).toBe(true); // future
  });

  it('is not paused after the until date', () => {
    expect(isBedtimePaused('2026-07-09', night)).toBe(false);
  });
});
