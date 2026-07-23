import { create } from 'zustand';

import { initDatabase } from '@/db/client';
import {
  addAdjustment,
  addPromise,
  addRedemption,
  addStarEvent,
  createClub,
  getSettings,
  listChildren,
} from '@/db/repo';
import type { Child, Settings } from '@/db/schema';
import { requestAlarmPermissions, scheduleAllAlarms } from '@/lib/alarms';
import type { LastAction } from '@/lib/lastAction';
import { syncChildShortcuts } from '@/lib/shortcuts';

interface AppState {
  ready: boolean;
  children: Child[];
  settings: Settings | null;
  /** Whether the settings/assessment PIN has been entered this session. */
  unlocked: boolean;
  /** Most recent repeatable action, powering the "Do the same" suggestion. */
  lastAction: LastAction | null;

  init: () => Promise<void>;
  reload: () => void;
  refresh: () => Promise<void>;
  setUnlocked: (v: boolean) => void;
  recordAction: (action: LastAction) => void;
  clearLastAction: () => void;
  applyLastActionTo: (childId: number) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  ready: false,
  children: [],
  settings: null,
  unlocked: false,
  lastAction: null,

  init: async () => {
    initDatabase();
    get().reload();
    set({ ready: true });
    try {
      await requestAlarmPermissions();
      await scheduleAllAlarms();
    } catch (err) {
      console.warn('Alarm setup failed', err);
    }
  },

  reload: () => {
    const children = listChildren(false);
    const settings = getSettings();
    set({ children, settings });
    void syncChildShortcuts(children, settings.featureHomeShortcuts);
  },

  refresh: async () => {
    get().reload();
    try {
      await scheduleAllAlarms();
    } catch (err) {
      console.warn('Reschedule failed', err);
    }
  },

  setUnlocked: (v) => set({ unlocked: v }),

  recordAction: (action) => set({ lastAction: action }),
  clearLastAction: () => set({ lastAction: null }),

  applyLastActionTo: async (childId) => {
    const action = get().lastAction;
    if (!action) return;
    switch (action.type) {
      case 'treat':
        addAdjustment(childId, 'treat');
        break;
      case 'penalty':
        addAdjustment(childId, 'penalty');
        break;
      case 'star':
        addStarEvent({
          childId,
          kind: action.kind,
          stars: action.stars,
          reasonText: action.reasonText,
          note: action.note,
        });
        break;
      case 'redeem':
        addRedemption({ childId, stars: action.stars, goalId: action.goalId, note: action.note });
        break;
      case 'club':
        createClub({ ...action.club, childId });
        break;
      case 'promise':
        addPromise(childId, action.text);
        break;
    }
    // Re-point the suggestion at this child so it can be chained onwards.
    set({ lastAction: { ...action, childId, ts: Date.now() } });
    await get().refresh();
  },
}));

export const activeChildren = (children: Child[]): Child[] => children.filter((c) => c.active);
