/** Describes the most recent repeatable action, so it can be re-applied to
 * another child ("Do the same for …"). Kept intentionally serialisable. */
export type LastAction =
  | { type: 'treat'; childId: number; ts: number }
  | { type: 'penalty'; childId: number; ts: number }
  | {
      type: 'star';
      childId: number;
      ts: number;
      kind: 'good' | 'slip';
      stars: number;
      reasonText?: string;
      note?: string;
    }
  | {
      type: 'redeem';
      childId: number;
      ts: number;
      stars: number;
      goalId: number | null;
      note?: string;
    }
  | {
      type: 'club';
      childId: number;
      ts: number;
      club: {
        name: string;
        weekday: number;
        startMinutes: number;
        durationMinutes: number;
        warningLeadMinutes: number;
        color: string;
      };
    }
  | { type: 'promise'; childId: number; ts: number; text: string };

/** How long a "do the same" suggestion stays offered after the action. */
export const DO_THE_SAME_WINDOW_MS = 5 * 60 * 1000;

/** Whether a suggestion should be offered for `childId` right now. */
export function shouldOfferDoTheSame(
  action: LastAction | null,
  childId: number,
  now = Date.now(),
): boolean {
  if (!action) return false;
  if (action.childId === childId) return false;
  return now - action.ts <= DO_THE_SAME_WINDOW_MS;
}

/** Short, friendly label for the "Do the same" button. */
export function describeLastAction(action: LastAction): string {
  switch (action.type) {
    case 'treat':
      return 'Give a treat (later bedtime)';
    case 'penalty':
      return 'Add a penalty (earlier bedtime)';
    case 'star':
      return action.kind === 'good'
        ? `Give ${action.stars} star${action.stars === 1 ? '' : 's'}${action.reasonText ? ` · ${action.reasonText}` : ''}`
        : `Slip-up: -${action.stars} star${action.stars === 1 ? '' : 's'}`;
    case 'redeem':
      return `Redeem ${action.stars} stars${action.note ? ` · ${action.note}` : ''}`;
    case 'club':
      return `Add club: ${action.club.name}`;
    case 'promise':
      return `Pinky promise: ${action.text}`;
  }
}
