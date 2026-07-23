import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react';
import { Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { NavBar } from '@/components/NavBar';
import { Screen } from '@/components/Screen';
import { listGoals, starBalance } from '@/db/repo';
import { nextGoal, starMoney } from '@/lib/stars';
import { activeChildren, useStore } from '@/store/useStore';

export default function Rewards() {
  const children = useStore((s) => s.children);
  const settings = useStore((s) => s.settings);
  const reload = useStore((s) => s.reload);
  const kids = activeChildren(children);
  const goals = listGoals(true);

  useFocusEffect(useCallback(() => reload(), [reload]));

  const pencePerStar = settings?.pencePerStar ?? 5;
  const symbol = settings?.currencySymbol ?? '£';

  return (
    <Screen>
      <NavBar
        title="Stars & rewards"
        subtitle="Celebrate the good stuff"
        back
        right={[
          { icon: 'stats-chart', onPress: () => router.push('/star-stats') },
          { icon: 'gift', onPress: () => router.push('/goals') },
        ]}
      />

      {kids.length === 0 ? (
        <Text className="mt-8 text-center text-night-300">Add a child to start earning stars.</Text>
      ) : (
        kids.map((child) => {
          const bal = starBalance(child.id);
          const goal = nextGoal(bal.bank, goals);
          return (
            <Card key={child.id} className="mb-4">
              <View className="flex-row items-center gap-3">
                <Avatar name={child.name} photoUri={child.photoUri} color={child.color} size={52} />
                <View className="flex-1">
                  <Text className="text-lg font-bold text-white">{child.name}</Text>
                  <Text className="text-sm text-night-300">
                    {starMoney(bal.bank, pencePerStar, symbol)} saved · {bal.redeemed} redeemed
                  </Text>
                </View>
                <View className="items-end">
                  <Text
                    className={`text-3xl font-black ${bal.bank < 0 ? 'text-bad' : 'text-star'}`}
                  >
                    {bal.bank}
                  </Text>
                  <Text className={`text-xs ${bal.bank < 0 ? 'text-bad' : 'text-night-300'}`}>
                    {bal.bank < 0 ? 'in debt' : 'stars'}
                  </Text>
                </View>
              </View>

              {goal && (
                <View className="mt-3">
                  <View className="mb-1 flex-row justify-between">
                    <Text className="text-xs text-night-200">
                      {goal.goal.emoji} {goal.goal.name}
                    </Text>
                    <Text className="text-xs text-night-300">{goal.remaining} to go</Text>
                  </View>
                  <View className="h-2 overflow-hidden rounded-full bg-night-900">
                    <View
                      className="h-2 rounded-full bg-star"
                      style={{ width: `${Math.round(goal.fraction * 100)}%` }}
                    />
                  </View>
                </View>
              )}

              <View className="mt-4 flex-row gap-2">
                <View className="flex-1">
                  <Button
                    label="Star"
                    variant="good"
                    icon={<Ionicons name="star" size={16} color="#1E1B4B" />}
                    onPress={() =>
                      router.push({
                        pathname: '/star-award',
                        params: { childId: String(child.id), kind: 'good' },
                      })
                    }
                  />
                </View>
                <View className="flex-1">
                  <Button
                    label="Slip-up"
                    variant="bad"
                    icon={<Ionicons name="cloud" size={16} color="#1E1B4B" />}
                    onPress={() =>
                      router.push({
                        pathname: '/star-award',
                        params: { childId: String(child.id), kind: 'slip' },
                      })
                    }
                  />
                </View>
                <View className="flex-1">
                  <Button
                    label="Redeem"
                    variant="treat"
                    icon={<Ionicons name="cart" size={16} color="#1E1B4B" />}
                    onPress={() =>
                      router.push({
                        pathname: '/redeem',
                        params: { childId: String(child.id) },
                      })
                    }
                  />
                </View>
              </View>

              <Button
                className="mt-2"
                label="History & stats"
                variant="ghost"
                icon={<Ionicons name="stats-chart" size={16} color="#E0E3FF" />}
                onPress={() =>
                  router.push({ pathname: '/star-stats', params: { childId: String(child.id) } })
                }
              />
            </Card>
          );
        })
      )}
    </Screen>
  );
}
