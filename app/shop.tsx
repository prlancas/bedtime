import { useCallback, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { NavBar } from '@/components/NavBar';
import { Screen } from '@/components/Screen';
import { addRedemption, getChild, getSettings, listGoals, starBalance } from '@/db/repo';
import { starMoney } from '@/lib/stars';
import { useStore } from '@/store/useStore';

export default function Shop() {
  const params = useLocalSearchParams<{ childId?: string }>();
  const childId = Number(params.childId);
  const child = getChild(childId);
  const settings = getSettings();
  const refresh = useStore((s) => s.refresh);
  const recordAction = useStore((s) => s.recordAction);
  const [, setTick] = useState(0);
  useFocusEffect(useCallback(() => setTick((t) => t + 1), []));

  if (!child) {
    return (
      <Screen>
        <NavBar title="Star shop" back />
        <Text className="text-night-300">Child not found.</Text>
      </Screen>
    );
  }

  const bal = starBalance(childId);
  const items = listGoals(true);
  const affordable = items.filter((g) => g.starCost <= bal.bank);
  const saving = items.filter((g) => g.starCost > bal.bank);

  function buy(goalId: number, name: string, cost: number) {
    Alert.alert('Cash in stars?', `Spend ${cost} stars on ${name}?`, [
      { text: 'Not yet', style: 'cancel' },
      {
        text: `Buy for ${cost}★`,
        onPress: async () => {
          addRedemption({ childId, stars: cost, goalId, note: name });
          recordAction({
            type: 'redeem',
            childId,
            ts: Date.now(),
            stars: cost,
            goalId,
            note: name,
          });
          await refresh();
          router.replace({
            pathname: '/reward-earned',
            params: { childId: String(childId), item: name, stars: String(cost) },
          });
        },
      },
    ]);
  }

  return (
    <Screen>
      <NavBar title="Star shop" subtitle={child.name} back />

      <Card className="mb-4 flex-row items-center gap-3">
        <Avatar name={child.name} photoUri={child.photoUri} color={child.color} size={52} />
        <View className="flex-1">
          <Text className="text-sm text-night-300">Stars in the bank</Text>
          <Text className={`text-3xl font-black ${bal.bank < 0 ? 'text-bad' : 'text-star'}`}>
            {bal.bank}★
          </Text>
        </View>
        <Text className="text-sm text-night-300">
          {starMoney(bal.bank, settings.pencePerStar, settings.currencySymbol)}
        </Text>
      </Card>

      {items.length === 0 && (
        <Text className="text-night-300">
          No shop items yet. Add rewards in Settings › Rewards & goals.
        </Text>
      )}

      {affordable.length > 0 && (
        <>
          <Text className="mb-2 text-lg font-bold text-white">Can buy now 🎉</Text>
          {affordable.map((g) => (
            <Pressable key={g.id} onPress={() => buy(g.id, g.name, g.starCost)} className="mb-2">
              <Card className="flex-row items-center gap-3">
                <Text className="text-3xl">{g.emoji}</Text>
                <View className="flex-1">
                  <Text className="text-base font-bold text-white">{g.name}</Text>
                  <Text className="text-xs text-night-300">{g.starCost} stars</Text>
                </View>
                <View className="rounded-full bg-good px-4 py-2">
                  <Text className="font-bold text-night-900">Buy</Text>
                </View>
              </Card>
            </Pressable>
          ))}
        </>
      )}

      {saving.length > 0 && (
        <>
          <Text className="mb-2 mt-6 text-lg font-bold text-white">Saving up for…</Text>
          {saving.map((g) => {
            const missing = g.starCost - bal.bank;
            const havePct = Math.max(0, Math.round((Math.max(0, bal.bank) / g.starCost) * 100));
            return (
              <Card key={g.id} className="mb-2">
                <View className="flex-row items-center gap-3">
                  <Text className="text-3xl">{g.emoji}</Text>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-white">{g.name}</Text>
                    <Text className="text-xs text-night-300">{g.starCost} stars</Text>
                  </View>
                </View>
                <View className="mt-3 h-3 flex-row overflow-hidden rounded-full bg-night-900">
                  <View className="h-3 bg-good" style={{ width: `${havePct}%` }} />
                  <View className="h-3 bg-bad" style={{ width: `${100 - havePct}%` }} />
                </View>
                <View className="mt-1 flex-row justify-between">
                  <Text className="text-xs font-bold text-good">{Math.max(0, bal.bank)} saved</Text>
                  <Text className="text-xs font-bold text-bad">{missing} to go</Text>
                </View>
              </Card>
            );
          })}
        </>
      )}
    </Screen>
  );
}
