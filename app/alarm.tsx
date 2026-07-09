import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import notifee from 'react-native-notify-kit';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { childrenForAlarm, type AlarmKind } from '@/lib/alarms';
import { playSound, stopSound } from '@/lib/sound';
import { formatTime, minutesFromDate } from '@/lib/time';
import { activeChildren, useStore } from '@/store/useStore';

export default function Alarm() {
  const params = useLocalSearchParams<{ kind?: string }>();
  const kind: AlarmKind = params.kind === 'warning' ? 'warning' : 'bedtime';
  const allChildren = useStore((s) => s.children);

  const matched = childrenForAlarm(kind);
  const kids = matched.length > 0 ? matched : activeChildren(allChildren).slice(0, 2);

  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1.08, { duration: 700, easing: Easing.inOut(Easing.ease) }), -1, true);
    playSound(kind === 'bedtime' ? 'bedtime' : 'warning', kind === 'bedtime');
    return () => stopSound();
  }, [kind, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  async function dismiss(goReview: boolean) {
    stopSound();
    const ids = await notifee.getDisplayedNotifications().catch(() => []);
    if (ids.length) await notifee.cancelAllNotifications().catch(() => {});
    if (goReview) router.replace('/assess');
    else router.back();
  }

  const isBedtime = kind === 'bedtime';
  const avatarSize = kids.length > 1 ? 120 : 180;

  return (
    <View className={`flex-1 ${isBedtime ? 'bg-night-950' : 'bg-night-800'}`}>
      <SafeAreaView className="flex-1 items-center justify-between px-6 py-10">
        <View className="items-center">
          <Text className="text-6xl">{isBedtime ? '🌙' : '⏰'}</Text>
          <Text className="mt-3 text-center text-3xl font-black text-white">
            {isBedtime ? 'Time for bed!' : 'Bedtime soon!'}
          </Text>
          <Text className="mt-1 text-center text-night-200">
            {isBedtime
              ? `It's ${formatTime(minutesFromDate(new Date()))}`
              : 'Get a snack, brush teeth, and get ready.'}
          </Text>
        </View>

        <Animated.View style={pulseStyle} className="flex-row flex-wrap items-center justify-center gap-6">
          {kids.map((child) => (
            <View key={child.id} className="items-center">
              <Avatar name={child.name} photoUri={child.photoUri} color={child.color} size={avatarSize} />
              <Text className="mt-3 text-xl font-black text-white">{child.name}</Text>
            </View>
          ))}
          {kids.length === 0 && <Text className="text-night-200">No kids scheduled right now.</Text>}
        </Animated.View>

        <View className="w-full gap-3">
          {isBedtime ? (
            <>
              <Button
                label="Off to bed — start review"
                variant="primary"
                icon={<Ionicons name="bed" size={20} color="#fff" />}
                onPress={() => dismiss(true)}
              />
              <Button label="Dismiss" variant="ghost" onPress={() => dismiss(false)} />
            </>
          ) : (
            <Button
              label="Got it!"
              variant="good"
              icon={<Ionicons name="checkmark" size={20} color="#1E1B4B" />}
              onPress={() => dismiss(false)}
            />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}
