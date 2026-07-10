import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Avatar } from './Avatar';
import { getRecordForDate, getSettings, streak } from '@/db/repo';
import type { Child } from '@/db/schema';
import { effectiveBedtime } from '@/lib/bedtime';
import { dateKey, formatTime } from '@/lib/time';
import { countdownLabel } from '@/lib/useNow';

const OUTCOME_STYLE = {
  good: { label: 'Good night', bg: 'bg-good', icon: 'happy' as const },
  bad: { label: 'Tricky night', bg: 'bg-bad', icon: 'sad' as const },
  revoked: { label: 'Revoked', bg: 'bg-bad', icon: 'close-circle' as const },
};

export function ChildTonightCard({ child, now }: { child: Child; now: Date }) {
  const settings = getSettings();
  const bedtimeMin = effectiveBedtime(child.baseBedtimeMinutes, now, settings);
  const warningMin = bedtimeMin - child.warningLeadMinutes;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nextTargetMin = nowMin < warningMin ? warningMin : bedtimeMin;
  const record = getRecordForDate(child.id, dateKey());
  const days = streak(child.id);

  return (
    <Pressable
      onPress={() => router.push(`/kids/${child.id}`)}
      className="mb-4 rounded-3xl bg-night-800/80 p-5 active:opacity-90"
    >
      <View className="flex-row items-center gap-4">
        <Avatar name={child.name} photoUri={child.photoUri} color={child.color} size={64} />
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-xl font-black text-white">{child.name}</Text>
            {days > 0 && (
              <View className="flex-row items-center rounded-full bg-night-900 px-2 py-0.5">
                <Ionicons name="flame" size={14} color="#FBBF24" />
                <Text className="ml-1 text-xs font-bold text-star">{days}</Text>
              </View>
            )}
          </View>
          <View className="mt-1 flex-row items-center gap-1">
            <Ionicons name="moon" size={14} color="#FDE68A" />
            <Text className="text-base font-semibold text-moon">{formatTime(bedtimeMin)}</Text>
            <Text className="text-night-300"> · warning {formatTime(warningMin)}</Text>
          </View>
        </View>
        {record ? (
          <View
            className={`items-center rounded-2xl px-3 py-2 ${OUTCOME_STYLE[record.outcome].bg}`}
          >
            <Ionicons name={OUTCOME_STYLE[record.outcome].icon} size={18} color="#1E1B4B" />
            <Text className="mt-0.5 text-[10px] font-bold text-night-900">
              {OUTCOME_STYLE[record.outcome].label}
            </Text>
          </View>
        ) : (
          <View className="items-center rounded-2xl bg-night-900 px-3 py-2">
            <Text className="text-xs font-bold text-night-100">
              {countdownLabel(nextTargetMin, now)}
            </Text>
            <Text className="text-[10px] text-night-300">
              until {nowMin < warningMin ? 'warning' : 'bed'}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}
