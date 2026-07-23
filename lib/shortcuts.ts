import * as QuickActions from 'expo-quick-actions';

import type { Child } from '@/db/schema';

/**
 * Sync per-child app quick actions (long-press the app icon; on Android these
 * can be pinned to the home screen). Each opens that child's profile via a
 * deep link handled by `useQuickActionRouting` in the root layout.
 *
 * Platform note: apps cannot programmatically place a launcher icon on iOS, so
 * on iOS these appear in the icon's long-press menu; on Android they appear in
 * the long-press menu and can be dragged/pinned to the home screen.
 */
export async function syncChildShortcuts(children: Child[], enabled: boolean): Promise<void> {
  try {
    if (!enabled) {
      await QuickActions.setItems([]);
      return;
    }
    const active = children.filter((c) => c.active).slice(0, 4); // platforms cap the count
    await QuickActions.setItems(
      active.map((child) => ({
        id: `child-${child.id}`,
        title: child.name,
        subtitle: 'Open profile',
        icon: 'symbol:star.fill',
        params: { href: `/kids/${child.id}` },
      })),
    );
  } catch {
    // Quick actions are a nice-to-have; never let them break app startup.
  }
}
