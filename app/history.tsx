import { useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { Avatar } from '@/components/Avatar';
import { BedtimeChart, ReasonBars } from '@/components/Charts';
import { Card } from '@/components/Card';
import { NavBar } from '@/components/NavBar';
import { Screen } from '@/components/Screen';
import { listRecords, reasonStats, recordsSince, streak } from '@/db/repo';
import { addDays, dateKey } from '@/lib/time';
import { activeChildren, useStore } from '@/store/useStore';

export default function History() {
  const children = useStore((s) => s.children);
  const reload = useStore((s) => s.reload);
  useFocusEffect(useCallback(() => reload(), [reload]));

  const kids = activeChildren(children);
  const since = dateKey(addDays(new Date(), -30));
  const allReasons = reasonStats();

  return (
    <Screen>
      <NavBar title="History" subtitle="Last 30 days" back />

      {kids.length === 0 ? (
        <Text className="text-night-300">Add kids and assess a few nights to see history.</Text>
      ) : (
        <>
          {kids.map((child) => {
            const records = recordsSince(child.id, since);
            const recent = listRecords(child.id, 30);
            const good = recent.filter((r) => r.outcome === 'good').length;
            const bad = recent.length - good;
            return (
              <Pressable
                key={child.id}
                onPress={() => router.push(`/kids/${child.id}`)}
                className="mb-4"
              >
                <Card>
                  <View className="flex-row items-center gap-3">
                    <Avatar
                      name={child.name}
                      photoUri={child.photoUri}
                      color={child.color}
                      size={44}
                    />
                    <View className="flex-1">
                      <Text className="text-lg font-bold text-white">{child.name}</Text>
                      <Text className="text-xs text-night-300">
                        {good} good · {bad} tricky · 🔥 {streak(child.id)} streak
                      </Text>
                    </View>
                  </View>
                  <BedtimeChart records={records} />
                </Card>
              </Pressable>
            );
          })}

          <Text className="mb-2 mt-2 text-lg font-bold text-white">Top reasons (all kids)</Text>
          <Card>
            <ReasonBars data={allReasons} />
          </Card>
        </>
      )}
    </Screen>
  );
}
