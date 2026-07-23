import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { NavBar } from '@/components/NavBar';
import { Screen } from '@/components/Screen';
import {
  getChild,
  getSettings,
  listRedemptions,
  listStarEvents,
  starBalance,
  starReasonStats,
} from '@/db/repo';
import { starMoney } from '@/lib/stars';
import { activeChildren, useStore } from '@/store/useStore';

export default function StarStats() {
  const params = useLocalSearchParams<{ childId?: string }>();
  const children = useStore((s) => s.children);
  const kids = activeChildren(children);
  const [selected, setSelected] = useState<number | null>(
    params.childId ? Number(params.childId) : (kids[0]?.id ?? null),
  );

  const child = selected ? getChild(selected) : undefined;
  const settings = getSettings();

  return (
    <Screen>
      <NavBar title="Star stats" subtitle="Reasons & history" back />

      {kids.length > 1 && (
        <View className="mb-4 flex-row flex-wrap gap-2">
          {kids.map((k) => (
            <Pressable
              key={k.id}
              onPress={() => setSelected(k.id)}
              className={`flex-row items-center gap-2 rounded-full px-3 py-2 active:opacity-70 ${
                selected === k.id ? 'bg-night-400' : 'bg-night-900'
              }`}
            >
              <Avatar name={k.name} photoUri={k.photoUri} color={k.color} size={22} />
              <Text className="text-white">{k.name}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {!child ? (
        <Text className="text-night-300">Add a child to see star stats.</Text>
      ) : (
        <StatsFor
          childId={child.id}
          symbol={settings.currencySymbol}
          pence={settings.pencePerStar}
        />
      )}
    </Screen>
  );
}

function StatsFor({ childId, symbol, pence }: { childId: number; symbol: string; pence: number }) {
  const bal = starBalance(childId);
  const reasonStats = starReasonStats(childId);
  const events = listStarEvents(childId, 40);
  const redemptions = listRedemptions(childId, 40);
  const maxCount = Math.max(1, ...reasonStats.map((r) => r.count));

  return (
    <>
      <Card className="mb-4 flex-row justify-between">
        <Stat label="Bank" value={`${bal.bank}★`} danger={bal.bank < 0} />
        <Stat label="Value" value={starMoney(bal.bank, pence, symbol)} danger={bal.bank < 0} />
        <Stat label="Earned" value={`${bal.earned}★`} />
        <Stat label="Redeemed" value={`${bal.redeemed}★`} />
      </Card>

      <Text className="mb-2 text-lg font-bold text-white">Reasons</Text>
      {reasonStats.length === 0 ? (
        <Text className="mb-4 text-night-300">No reasons recorded yet.</Text>
      ) : (
        <Card className="mb-4 gap-3">
          {reasonStats.map((r) => (
            <View key={`${r.reason}-${r.kind}`}>
              <View className="mb-1 flex-row justify-between">
                <Text className="text-sm text-white">
                  {r.kind === 'slip' ? '⚠️ ' : '⭐ '}
                  {r.reason}
                </Text>
                <Text className="text-xs text-night-300">
                  {r.count}× · {r.stars > 0 ? '+' : ''}
                  {r.stars}★
                </Text>
              </View>
              <View className="h-2 overflow-hidden rounded-full bg-night-900">
                <View
                  className={`h-2 rounded-full ${r.kind === 'slip' ? 'bg-bad' : 'bg-star'}`}
                  style={{ width: `${Math.round((r.count / maxCount) * 100)}%` }}
                />
              </View>
            </View>
          ))}
        </Card>
      )}

      <Text className="mb-2 text-lg font-bold text-white">Redemptions</Text>
      {redemptions.length === 0 ? (
        <Text className="mb-4 text-night-300">Nothing redeemed yet.</Text>
      ) : (
        <Card className="mb-4 gap-2">
          {redemptions.map((r) => (
            <View key={r.id} className="flex-row items-center justify-between">
              <Text className="flex-1 text-white">
                {r.goalEmoji ? `${r.goalEmoji} ` : '🎁 '}
                {r.note || r.goalName || 'Reward'}
              </Text>
              <Text className="text-xs text-night-300">{r.date}</Text>
              <Text className="ml-3 text-sm font-bold text-treat">-{r.stars}★</Text>
            </View>
          ))}
        </Card>
      )}

      <Text className="mb-2 text-lg font-bold text-white">Recent activity</Text>
      {events.length === 0 ? (
        <Text className="text-night-300">No stars recorded yet.</Text>
      ) : (
        <Card className="gap-2">
          {events.map((e) => (
            <View key={e.id} className="flex-row items-center justify-between">
              <Ionicons
                name={e.kind === 'slip' ? 'cloud' : 'star'}
                size={16}
                color={e.kind === 'slip' ? '#FB7185' : '#FCD34D'}
              />
              <Text className="ml-2 flex-1 text-white">
                {e.note || (e.kind === 'slip' ? 'Slip-up' : 'Good deed')}
              </Text>
              <Text className="text-xs text-night-300">{e.date}</Text>
              <Text className={`ml-3 text-sm font-bold ${e.stars < 0 ? 'text-bad' : 'text-star'}`}>
                {e.stars > 0 ? '+' : ''}
                {e.stars}★
              </Text>
            </View>
          ))}
        </Card>
      )}
    </>
  );
}

function Stat({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <View className="items-center">
      <Text className={`text-lg font-black ${danger ? 'text-bad' : 'text-white'}`}>{value}</Text>
      <Text className="text-xs text-night-300">{label}</Text>
    </View>
  );
}
