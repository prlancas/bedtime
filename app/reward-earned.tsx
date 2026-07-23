import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { getChild, listStarEvents } from '@/db/repo';
import { formatDate } from '@/lib/time';

export default function RewardEarned() {
  const params = useLocalSearchParams<{ childId?: string; item?: string; stars?: string }>();
  const childId = Number(params.childId);
  const child = getChild(childId);
  const item = params.item ?? 'your reward';
  const stars = params.stars ?? '';

  // The good deeds behind the stars — so the child sees *why* they earned it.
  const goodDeeds = child
    ? listStarEvents(childId, 100)
        .filter((e) => e.stars > 0)
        .slice(0, 20)
    : [];

  return (
    <Screen>
      <View className="mt-6 items-center">
        <Text className="text-6xl">🎉</Text>
        {child && (
          <Avatar name={child.name} photoUri={child.photoUri} color={child.color} size={72} />
        )}
        <Text className="mt-3 text-center text-2xl font-black text-white">
          {child?.name} earned {item}!
        </Text>
        {stars ? (
          <Text className="mt-1 text-center text-star">Cashed in {stars} stars ⭐</Text>
        ) : null}
      </View>

      <Text className="mb-2 mt-6 text-lg font-bold text-white">You earned it by…</Text>
      {goodDeeds.length === 0 ? (
        <Text className="text-night-300">
          Lots of great behaviour! Keep collecting stars for the next treat.
        </Text>
      ) : (
        <Card className="gap-2">
          {goodDeeds.map((e) => (
            <View key={e.id} className="flex-row items-center gap-2">
              <Text className="text-base">⭐</Text>
              <Text className="flex-1 text-white">{e.note || 'A good deed'}</Text>
              <Text className="text-xs text-night-300">{formatDate(new Date(e.createdAt))}</Text>
              <Text className="ml-2 text-sm font-bold text-star">+{e.stars}</Text>
            </View>
          ))}
        </Card>
      )}

      <Button
        className="mt-6"
        label="Woohoo!"
        variant="good"
        icon={<Ionicons name="happy" size={20} color="#1E1B4B" />}
        onPress={() => router.back()}
      />
    </Screen>
  );
}
