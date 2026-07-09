import { create } from 'zustand';

import { initDatabase } from '@/db/client';
import { getSettings, listChildren } from '@/db/repo';
import type { Child, Settings } from '@/db/schema';
import { requestAlarmPermissions, scheduleAllAlarms } from '@/lib/alarms';

interface AppState {
  ready: boolean;
  children: Child[];
  settings: Settings | null;
  /** Whether the settings/assessment PIN has been entered this session. */
  unlocked: boolean;

  init: () => Promise<void>;
  reload: () => void;
  refresh: () => Promise<void>;
  setUnlocked: (v: boolean) => void;
}

export const useStore = create<AppState>((set, get) => ({
  ready: false,
  children: [],
  settings: null,
  unlocked: false,

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
    set({ children: listChildren(false), settings: getSettings() });
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
}));

export const activeChildren = (children: Child[]): Child[] => children.filter((c) => c.active);
