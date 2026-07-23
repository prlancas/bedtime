import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { updateSettings } from '@/db/repo';
import { useStore } from '@/store/useStore';

interface Slide {
  emoji: string;
  title: string;
  body: string;
}

const SLIDES: Slide[] = [
  {
    emoji: '🌙',
    title: 'Welcome to Bedtime',
    body: 'Help your kids get to bed calmly, and reward the good stuff. Here’s a quick tour — you can replay it any time from Settings.',
  },
  {
    emoji: '⏰',
    title: 'Bedtimes & alarms',
    body: 'Each child gets a bedtime with a pre-bed warning. Good nights earn a later bedtime; rough nights move it earlier. Custom per-child sounds too.',
  },
  {
    emoji: '⭐',
    title: 'Stars & the shop',
    body: 'Give stars for good deeds (or a “slip-up” to remove some). Kids cash them in at the star shop for rewards you set up.',
  },
  {
    emoji: '📆',
    title: 'Clubs & planner',
    body: 'Add weekly clubs like Beavers with their own reminders, mute them for holidays, and see everything on the planner.',
  },
  {
    emoji: '🤙',
    title: 'Pinky promises & more',
    body: 'Seal little promises with a tap, repeat an action across kids with “Do the same”, and pause bedtimes for a break. Turn features on/off in Settings.',
  },
];

export default function Tour() {
  const [index, setIndex] = useState(0);
  const reload = useStore((s) => s.reload);
  const slide = SLIDES[index];
  const last = index === SLIDES.length - 1;

  function finish() {
    updateSettings({ tourSeen: true });
    reload();
    router.back();
  }

  return (
    <View className="flex-1 bg-night-950">
      <SafeAreaView className="flex-1 px-6 py-8">
        <View className="flex-row justify-end">
          <Pressable onPress={finish} className="p-2 active:opacity-70">
            <Text className="text-night-300">Skip</Text>
          </Pressable>
        </View>

        <View className="flex-1 items-center justify-center">
          <Text className="text-7xl">{slide.emoji}</Text>
          <Text className="mt-6 text-center text-3xl font-black text-white">{slide.title}</Text>
          <Text className="mt-3 text-center text-base leading-6 text-night-200">{slide.body}</Text>
        </View>

        <View className="mb-6 flex-row justify-center gap-2">
          {SLIDES.map((s, i) => (
            <View
              key={s.title}
              className={`h-2 rounded-full ${i === index ? 'w-6 bg-moon' : 'w-2 bg-night-700'}`}
            />
          ))}
        </View>

        {last ? (
          <Button
            label="Get started"
            variant="primary"
            icon={<Ionicons name="rocket" size={20} color="#fff" />}
            onPress={finish}
          />
        ) : (
          <Button
            label="Next"
            variant="primary"
            icon={<Ionicons name="arrow-forward" size={20} color="#fff" />}
            onPress={() => setIndex((i) => i + 1)}
          />
        )}
      </SafeAreaView>
    </View>
  );
}
