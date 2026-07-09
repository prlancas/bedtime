import { Platform } from 'react-native';
import notifee, {
  AlarmType,
  AndroidCategory,
  AndroidImportance,
  AndroidVisibility,
  TriggerType,
  type TimestampTrigger,
} from 'react-native-notify-kit';

import { getSettings, listChildren } from '@/db/repo';
import type { Child } from '@/db/schema';
import { effectiveBedtime } from '@/lib/bedtime';
import { addDays, dateAtMinutes, dateKey, formatTime } from '@/lib/time';

export type AlarmKind = 'warning' | 'bedtime';

export const WARNING_CHANNEL_ID = 'warning-alarm';
export const BEDTIME_CHANNEL_ID = 'bedtime-alarm';

/** How many days ahead we pre-schedule (rescheduled whenever data changes). */
const SCHEDULE_DAYS = 3;

/** Android resource / iOS bundle sound names (see app.json expo-notifications). */
const SOUND = {
  warning: { android: 'warning', ios: 'warning.wav' },
  bedtime: { android: 'bedtime', ios: 'bedtime.wav' },
};

export async function requestAlarmPermissions(): Promise<void> {
  await notifee.requestPermission({
    sound: true,
    alert: true,
    badge: true,
    criticalAlert: true,
  });
}

/** Create the two high-importance channels with distinct sounds. */
export async function ensureChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await notifee.createChannel({
    id: WARNING_CHANNEL_ID,
    name: 'Bedtime warning',
    description: 'Heads-up alarm before bedtime.',
    importance: AndroidImportance.HIGH,
    sound: SOUND.warning.android,
    vibration: true,
    vibrationPattern: [0, 300, 200, 300],
  });
  await notifee.createChannel({
    id: BEDTIME_CHANNEL_ID,
    name: 'Bedtime alarm',
    description: 'Time-for-bed alarm.',
    importance: AndroidImportance.HIGH,
    sound: SOUND.bedtime.android,
    vibration: true,
    vibrationPattern: [0, 600, 250, 600, 250, 600],
  });
}

function alarmId(kind: AlarmKind, childId: number, date: string): string {
  return `${kind}-${childId}-${date}`;
}

function buildTrigger(timestamp: number): TimestampTrigger {
  return {
    type: TriggerType.TIMESTAMP,
    timestamp,
    alarmManager: { type: AlarmType.SET_ALARM_CLOCK },
  };
}

async function scheduleOne(child: Child, kind: AlarmKind, when: Date, date: string): Promise<void> {
  const isBedtime = kind === 'bedtime';
  await notifee.createTriggerNotification(
    {
      id: alarmId(kind, child.id, date),
      title: isBedtime ? `\u{1F319} Bedtime for ${child.name}!` : `\u23F0 Get ready, ${child.name}!`,
      body: isBedtime
        ? `It's ${formatTime(when.getHours() * 60 + when.getMinutes())} \u2014 time for bed.`
        : `${child.warningLeadMinutes} minutes until bedtime. Grab a snack and get ready!`,
      data: { childId: String(child.id), kind, date },
      android: {
        channelId: isBedtime ? BEDTIME_CHANNEL_ID : WARNING_CHANNEL_ID,
        category: AndroidCategory.ALARM,
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
        loopSound: isBedtime,
        autoCancel: false,
        pressAction: { id: 'default', launchActivity: 'default' },
        fullScreenAction: { id: 'default', launchActivity: 'default' },
      },
      ios: {
        sound: isBedtime ? SOUND.bedtime.ios : SOUND.warning.ios,
        critical: false,
        interruptionLevel: 'timeSensitive',
      },
    },
    buildTrigger(when.getTime()),
  );
}

/**
 * Cancel all scheduled alarms and re-create them for the next few nights based
 * on each child's current bedtime. Call after any change to children/settings
 * or after an assessment.
 */
export async function scheduleAllAlarms(): Promise<void> {
  await ensureChannels();
  const ids = await notifee.getTriggerNotificationIds();
  if (ids.length) await notifee.cancelTriggerNotifications(ids);

  const settings = getSettings();
  const children = listChildren(true);
  const now = Date.now();

  for (const child of children) {
    for (let i = 0; i < SCHEDULE_DAYS; i += 1) {
      const day = addDays(new Date(), i);
      const date = dateKey(day);
      const bedtimeMin = effectiveBedtime(child.baseBedtimeMinutes, day, settings);
      const warningMin = bedtimeMin - child.warningLeadMinutes;

      const warningAt = dateAtMinutes(warningMin, day);
      const bedtimeAt = dateAtMinutes(bedtimeMin, day);

      if (warningAt.getTime() > now) await scheduleOne(child, 'warning', warningAt, date);
      if (bedtimeAt.getTime() > now) await scheduleOne(child, 'bedtime', bedtimeAt, date);
    }
  }
}

export async function cancelAllAlarms(): Promise<void> {
  const ids = await notifee.getTriggerNotificationIds();
  if (ids.length) await notifee.cancelTriggerNotifications(ids);
}

/**
 * Which children have an alarm of `kind` firing around `now` (within a window).
 * Used by the full-screen alarm to show one or many kids' photos at once.
 */
export function childrenForAlarm(kind: AlarmKind, windowMinutes = 20, now = new Date()): Child[] {
  const settings = getSettings();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return listChildren(true).filter((child) => {
    const bedtimeMin = effectiveBedtime(child.baseBedtimeMinutes, now, settings);
    const targetMin = kind === 'bedtime' ? bedtimeMin : bedtimeMin - child.warningLeadMinutes;
    return Math.abs(nowMin - targetMin) <= windowMinutes;
  });
}
