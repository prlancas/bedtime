import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { NavBar } from '@/components/NavBar';
import { Screen } from '@/components/Screen';
import { formatTime } from '@/lib/time';
import { useStore } from '@/store/useStore';

export default function KidsList() {
  const children = useStore((s) => s.children);
  const reload = useStore((s) => s.reload);

  useFocusEffect(useCallback(() => reload(), [reload]));

  return (
    <Screen>
      <NavBar
        title="Kids"
        back
        right={[{ icon: 'add', onPress: () => router.push('/kids/edit') }]}
      />

      {children.length === 0 ? (
        <Text className="mt-10 text-center text-night-300">No kids yet. Tap + to add one.</Text>
      ) : (
        children.map((child) => (
          <Pressable
            key={child.id}
            onPress={() => router.push(`/kids/${child.id}`)}
            className="mb-3 flex-row items-center gap-4 rounded-3xl bg-night-800/80 p-4 active:opacity-90"
          >
            <Avatar name={child.name} photoUri={child.photoUri} color={child.color} size={52} />
            <View className="flex-1">
              <Text className="text-lg font-bold text-white">{child.name}</Text>
              <Text className="text-sm text-night-300">Bedtime {formatTime(child.baseBedtimeMinutes)}</Text>
            </View>
            {!child.active && (
              <Text className="mr-2 rounded-full bg-night-900 px-2 py-1 text-xs text-night-300">Hidden</Text>
            )}
            <Ionicons name="chevron-forward" size={20} color="#5B5FE0" />
          </Pressable>
        ))
      )}

      <Button
        className="mt-4"
        label="Add a child"
        icon={<Ionicons name="add" size={20} color="#fff" />}
        onPress={() => router.push('/kids/edit')}
      />
    </Screen>
  );
}
