import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { Button } from '@/components/Button';
import { ChildTonightCard } from '@/components/ChildTonightCard';
import { NavBar } from '@/components/NavBar';
import { Screen } from '@/components/Screen';
import { getRecordForDate } from '@/db/repo';
import { dateKey, formatTime, minutesFromDate } from '@/lib/time';
import { useNow } from '@/lib/useNow';
import { activeChildren, useStore } from '@/store/useStore';

export default function Dashboard() {
  const now = useNow();
  const children = useStore((s) => s.children);
  const reload = useStore((s) => s.reload);
  const kids = activeChildren(children);

  useFocusEffect(useCallback(() => reload(), [reload]));

  const nowMin = minutesFromDate(now);
  const greeting = nowMin < 720 ? 'Good morning' : nowMin < 1020 ? 'Good afternoon' : 'Good evening';
  const pendingReview = kids.some((c) => !getRecordForDate(c.id, dateKey()));

  return (
    <Screen>
      <NavBar
        title="Bedtime"
        subtitle={`${greeting} · it's ${formatTime(nowMin)}`}
        right={[
          { icon: 'bar-chart', onPress: () => router.push('/history') },
          { icon: 'settings-sharp', onPress: () => router.push('/settings') },
        ]}
      />

      {kids.length === 0 ? (
        <View className="mt-16 items-center">
          <Text className="text-6xl">🌙</Text>
          <Text className="mt-4 text-center text-xl font-bold text-white">No kids yet</Text>
          <Text className="mt-2 mb-6 text-center text-night-300">
            Add your children to start tracking bedtimes and alarms.
          </Text>
          <Button
            label="Add a child"
            variant="primary"
            icon={<Ionicons name="add" size={20} color="#fff" />}
            onPress={() => router.push('/kids/edit')}
          />
        </View>
      ) : (
        <>
          {kids.map((child) => (
            <ChildTonightCard key={child.id} child={child} now={now} />
          ))}

          <View className="mt-2 gap-3">
            {pendingReview && (
              <Button
                label="Tonight's bedtime review"
                variant="primary"
                icon={<Ionicons name="checkmark-done" size={20} color="#fff" />}
                onPress={() => router.push('/assess')}
              />
            )}
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button
                  label="Kids"
                  variant="ghost"
                  icon={<Ionicons name="people" size={18} color="#E0E3FF" />}
                  onPress={() => router.push('/kids')}
                />
              </View>
              <View className="flex-1">
                <Button
                  label="History"
                  variant="ghost"
                  icon={<Ionicons name="bar-chart" size={18} color="#E0E3FF" />}
                  onPress={() => router.push('/history')}
                />
              </View>
            </View>
          </View>

          <Link href="/alarm?kind=bedtime" className="mt-6 text-center text-night-300">
            <Text className="text-night-300">Preview alarm screen</Text>
          </Link>
        </>
      )}
    </Screen>
  );
}
