import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { NavBar } from '@/components/NavBar';
import { PinGate } from '@/components/PinGate';
import { Screen } from '@/components/Screen';
import { setBedtimePause } from '@/db/repo';
import { isBedtimePaused } from '@/lib/bedtime';
import { addDays, dateFromKey, dateKey, formatDate } from '@/lib/time';
import { activeChildren, useStore } from '@/store/useStore';

export default function Pause() {
  return (
    <PinGate>
      <PauseInner />
    </PinGate>
  );
}

function PauseInner() {
  const children = useStore((s) => s.children);
  const refresh = useStore((s) => s.refresh);
  const [, setTick] = useState(0);
  const kids = activeChildren(children);

  async function pause(childId: number | null, days: number) {
    // days = 0 -> tonight only (until today). days = 6 -> a week.
    const until = dateKey(addDays(new Date(), days));
    setBedtimePause(childId, until);
    await refresh();
    setTick((t) => t + 1);
  }

  async function resume(childId: number | null) {
    setBedtimePause(childId, null);
    await refresh();
    setTick((t) => t + 1);
  }

  return (
    <Screen>
      <NavBar title="Pause bedtime" subtitle="Turn off alarms for a break" back />

      <Card className="mb-4 gap-3">
        <Text className="text-base font-bold text-white">Everyone</Text>
        <Text className="text-xs text-night-300">
          Handy for holidays or a special night. Warning + bedtime alarms are skipped while paused.
        </Text>
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Button label="Tonight" variant="ghost" onPress={() => pause(null, 0)} />
          </View>
          <View className="flex-1">
            <Button label="1 week" variant="ghost" onPress={() => pause(null, 6)} />
          </View>
          <View className="flex-1">
            <Button label="2 weeks" variant="ghost" onPress={() => pause(null, 13)} />
          </View>
        </View>
        <Button
          label="Resume everyone"
          icon={<Ionicons name="play" size={16} color="#fff" />}
          onPress={() => resume(null)}
        />
      </Card>

      <Text className="mb-2 text-lg font-bold text-white">Per child</Text>
      {kids.map((child) => {
        const paused = isBedtimePaused(child.bedtimePausedUntil, new Date());
        return (
          <Card key={child.id} className="mb-3">
            <View className="flex-row items-center gap-3">
              <Avatar name={child.name} photoUri={child.photoUri} color={child.color} size={44} />
              <View className="flex-1">
                <Text className="text-base font-bold text-white">{child.name}</Text>
                <Text className="text-xs text-night-300">
                  {paused && child.bedtimePausedUntil
                    ? `Paused until ${formatDate(dateFromKey(child.bedtimePausedUntil))}`
                    : 'Bedtime active'}
                </Text>
              </View>
              {paused && (
                <View className="rounded-full bg-treat px-3 py-1">
                  <Text className="text-xs font-bold text-night-900">Paused</Text>
                </View>
              )}
            </View>
            <View className="mt-3 flex-row gap-2">
              <View className="flex-1">
                <Button label="Tonight" variant="ghost" onPress={() => pause(child.id, 0)} />
              </View>
              <View className="flex-1">
                <Button label="1 week" variant="ghost" onPress={() => pause(child.id, 6)} />
              </View>
              <View className="flex-1">
                <Button
                  label="Resume"
                  variant={paused ? 'good' : 'ghost'}
                  onPress={() => resume(child.id)}
                />
              </View>
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}
