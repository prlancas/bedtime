import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { Card } from '@/components/Card';
import { NavBar } from '@/components/NavBar';
import { Screen } from '@/components/Screen';
import { clubsForDate, getChild } from '@/db/repo';
import { addDays, dateKey, formatTime, weekdayLabel } from '@/lib/time';

const DAYS_AHEAD = 14;

export default function Schedule() {
  const [, setTick] = useState(0);
  useFocusEffect(useCallback(() => setTick((t) => t + 1), []));

  const todayKey = dateKey();
  const days = Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(new Date(), i));

  return (
    <Screen>
      <NavBar title="Planner" subtitle="Next two weeks" back />

      <View className="mb-3 flex-row gap-4">
        <Legend color="#34D399" label="Free" />
        <Legend color="#38BDF8" label="Club / activity" />
      </View>

      {days.map((day) => {
        const key = dateKey(day);
        const clubs = clubsForDate(day);
        const free = clubs.length === 0;
        const isToday = key === todayKey;
        return (
          <Card key={key} className={`mb-2 border-l-4 ${free ? 'border-good' : 'border-activity'}`}>
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-bold text-white">
                {weekdayLabel(day)} {day.getDate()}
                {isToday ? ' · Today' : ''}
              </Text>
              {free ? (
                <View className="rounded-full bg-good/20 px-3 py-1">
                  <Text className="text-xs font-bold text-good">Free evening</Text>
                </View>
              ) : (
                <Text className="text-xs text-night-300">
                  {clubs.length} {clubs.length === 1 ? 'activity' : 'activities'}
                </Text>
              )}
            </View>

            {clubs.length > 0 && (
              <View className="mt-3 gap-2">
                {clubs.map((club) => {
                  const who = club.childId ? (getChild(club.childId)?.name ?? '') : 'Everyone';
                  return (
                    <Pressable
                      key={club.id}
                      onPress={() =>
                        router.push({ pathname: '/clubs/edit', params: { id: String(club.id) } })
                      }
                      className="flex-row items-center gap-3 rounded-2xl bg-night-900 p-3 active:opacity-70"
                    >
                      <View
                        style={{ backgroundColor: club.color }}
                        className="h-3 w-3 rounded-full"
                      />
                      <Text className="w-20 text-sm font-bold text-white">
                        {formatTime(club.startMinutes)}
                      </Text>
                      <Text className="flex-1 text-white">{club.name}</Text>
                      <Text className="text-xs text-night-300">{who}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </Card>
        );
      })}
    </Screen>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <View style={{ backgroundColor: color }} className="h-3 w-3 rounded-full" />
      <Text className="text-xs text-night-300">{label}</Text>
    </View>
  );
}
