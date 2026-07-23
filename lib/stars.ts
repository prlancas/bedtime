/** Pure helpers for the star reward economy (money + goal progress). */

export interface GoalLike {
  id: number;
  name: string;
  emoji: string;
  starCost: number;
}

/** Convert a number of stars into pence, given the configured rate. */
export function starsToPence(stars: number, pencePerStar: number): number {
  return Math.round(stars * pencePerStar);
}

/** Format pence as a currency string, e.g. 125 -> "£1.25", 5 -> "5p". */
export function formatMoney(pence: number, symbol = '£'): string {
  const sign = pence < 0 ? '-' : '';
  const abs = Math.abs(pence);
  if (abs < 100) return `${sign}${abs}p`;
  return `${sign}${symbol}${(abs / 100).toFixed(2)}`;
}

/** Convenience: money value of a star balance as a formatted string. */
export function starMoney(stars: number, pencePerStar: number, symbol = '£'): string {
  return formatMoney(starsToPence(stars, pencePerStar), symbol);
}

export interface GoalProgress {
  goal: GoalLike;
  remaining: number; // stars still needed
  fraction: number; // 0..1 progress toward the goal
}

/**
 * The next goal a child is saving toward: the cheapest active goal they cannot
 * yet afford. Returns null when there are no goals or all are affordable.
 */
export function nextGoal(bank: number, goals: GoalLike[]): GoalProgress | null {
  const sorted = [...goals].sort((a, b) => a.starCost - b.starCost);
  const target = sorted.find((g) => g.starCost > bank);
  if (!target) return null;
  return {
    goal: target,
    remaining: Math.max(0, target.starCost - bank),
    fraction: target.starCost > 0 ? Math.min(1, Math.max(0, bank / target.starCost)) : 1,
  };
}

/** Goals the child can currently afford (cost <= bank), most expensive first. */
export function affordableGoals(bank: number, goals: GoalLike[]): GoalLike[] {
  return goals.filter((g) => g.starCost <= bank).sort((a, b) => b.starCost - a.starCost);
}
