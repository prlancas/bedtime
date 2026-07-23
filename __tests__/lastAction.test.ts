import { describe, expect, it } from '@jest/globals';

import {
  DO_THE_SAME_WINDOW_MS,
  describeLastAction,
  shouldOfferDoTheSame,
  type LastAction,
} from '@/lib/lastAction';

const now = 1_000_000_000_000;

describe('shouldOfferDoTheSame', () => {
  const action: LastAction = { type: 'treat', childId: 1, ts: now };

  it('is false with no action', () => {
    expect(shouldOfferDoTheSame(null, 2, now)).toBe(false);
  });

  it('is false for the same child', () => {
    expect(shouldOfferDoTheSame(action, 1, now)).toBe(false);
  });

  it('is true for a different child within the window', () => {
    expect(shouldOfferDoTheSame(action, 2, now + 1000)).toBe(true);
    expect(shouldOfferDoTheSame(action, 2, now + DO_THE_SAME_WINDOW_MS)).toBe(true);
  });

  it('is false after the window expires', () => {
    expect(shouldOfferDoTheSame(action, 2, now + DO_THE_SAME_WINDOW_MS + 1)).toBe(false);
  });
});

describe('describeLastAction', () => {
  it('labels treats and penalties', () => {
    expect(describeLastAction({ type: 'treat', childId: 1, ts: now })).toMatch(/treat/i);
    expect(describeLastAction({ type: 'penalty', childId: 1, ts: now })).toMatch(/penalty/i);
  });

  it('labels stars with count and reason', () => {
    const label = describeLastAction({
      type: 'star',
      childId: 1,
      ts: now,
      kind: 'good',
      stars: 3,
      reasonText: 'tidied room',
    });
    expect(label).toContain('3 stars');
    expect(label).toContain('tidied room');
  });

  it('labels a single star without pluralising', () => {
    const label = describeLastAction({ type: 'star', childId: 1, ts: now, kind: 'good', stars: 1 });
    expect(label).toContain('1 star');
    expect(label).not.toContain('1 stars');
  });

  it('labels slip-ups, redeems, clubs and promises', () => {
    expect(
      describeLastAction({ type: 'star', childId: 1, ts: now, kind: 'slip', stars: 2 }),
    ).toMatch(/slip-up/i);
    expect(
      describeLastAction({
        type: 'redeem',
        childId: 1,
        ts: now,
        stars: 5,
        goalId: null,
        note: 'Ice cream',
      }),
    ).toContain('Ice cream');
    expect(
      describeLastAction({
        type: 'club',
        childId: 1,
        ts: now,
        club: {
          name: 'Beavers',
          weekday: 3,
          startMinutes: 1035,
          durationMinutes: 60,
          warningLeadMinutes: 30,
          color: '#38BDF8',
        },
      }),
    ).toContain('Beavers');
    expect(
      describeLastAction({ type: 'promise', childId: 1, ts: now, text: 'no moaning' }),
    ).toContain('no moaning');
  });
});
