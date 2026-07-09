import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { NavBar } from '@/components/NavBar';
import { PinGate } from '@/components/PinGate';
import { Screen } from '@/components/Screen';
import { assessNight, getRecordForDate, listReasons } from '@/db/repo';
import { outcomeMessage } from '@/lib/bedtime';
import { applyOutcome } from '@/lib/bedtime';
import { getSettings } from '@/db/repo';
import { dateKey } from '@/lib/time';
import { activeChildren, useStore } from '@/store/useStore';

export default function Assess() {
  return (
    <PinGate>
      <AssessInner />
    </PinGate>
  );
}

function AssessInner() {
  const params = useLocalSearchParams<{ childId?: string }>();
  const allChildren = useStore((s) => s.children);
  const refresh = useStore((s) => s.refresh);
  const settings = getSettings();
  const reasons = listReasons();

  const kids = params.childId
    ? allChildren.filter((c) => c.id === Number(params.childId))
    : activeChildren(allChildren);

  const [expanded, setExpanded] = useState<number | null>(null);
  const [reasonText, setReasonText] = useState<Record<number, string>>({});
  const [note, setNote] = useState<Record<number, string>>({});
  const [done, setDone] = useState<Record<number, 'good' | 'bad' | 'revoked'>>({});

  async function markGood(childId: number) {
    assessNight({ childId, outcome: 'good' });
    setDone((d) => ({ ...d, [childId]: 'good' }));
    setExpanded(null);
    await refresh();
  }

  async function saveBad(childId: number) {
    assessNight({
      childId,
      outcome: 'bad',
      reasonText: reasonText[childId]?.trim() || undefined,
      note: note[childId]?.trim() || undefined,
    });
    setDone((d) => ({ ...d, [childId]: 'bad' }));
    setExpanded(null);
    await refresh();
  }

  const allReviewed = kids.every((c) => done[c.id] || getRecordForDate(c.id, dateKey()));

  return (
    <Screen>
      <NavBar title="Bedtime review" subtitle={dateKey()} back />

      {kids.map((child) => {
        const existing = getRecordForDate(child.id, dateKey());
        const state = done[child.id] ?? existing?.outcome;
        const goodDelta = applyOutcome(child.baseBedtimeMinutes, 'good', settings) - child.baseBedtimeMinutes;
        const badDelta = applyOutcome(child.baseBedtimeMinutes, 'bad', settings) - child.baseBedtimeMinutes;

        return (
          <Card key={child.id} className="mb-4">
            <View className="flex-row items-center gap-3">
              <Avatar name={child.name} photoUri={child.photoUri} color={child.color} size={48} />
              <Text className="flex-1 text-lg font-bold text-white">{child.name}</Text>
              {state && (
                <View className={`rounded-full px-3 py-1 ${state === 'good' ? 'bg-good' : 'bg-bad'}`}>
                  <Text className="text-xs font-bold text-night-900">
                    {state === 'good' ? 'Good' : state === 'revoked' ? 'Revoked' : 'Bad'}
                  </Text>
                </View>
              )}
            </View>

            <View className="mt-3 flex-row gap-3">
              <View className="flex-1">
                <Button
                  label={`Good (+${goodDelta})`}
                  variant="good"
                  icon={<Ionicons name="happy" size={18} color="#1E1B4B" />}
                  onPress={() => markGood(child.id)}
                />
              </View>
              <View className="flex-1">
                <Button
                  label={`Bad (${badDelta})`}
                  variant="bad"
                  icon={<Ionicons name="sad" size={18} color="#1E1B4B" />}
                  onPress={() => setExpanded(expanded === child.id ? null : child.id)}
                />
              </View>
            </View>

            {expanded === child.id && (
              <View className="mt-4 gap-3">
                <Text className="text-sm font-semibold text-night-300">Why? (helps track patterns)</Text>
                <View className="flex-row flex-wrap gap-2">
                  {reasons.map((r) => (
                    <Pressable
                      key={r.id}
                      onPress={() => setReasonText((s) => ({ ...s, [child.id]: r.text }))}
                      className={`rounded-full px-3 py-2 active:opacity-70 ${
                        reasonText[child.id] === r.text ? 'bg-night-400' : 'bg-night-900'
                      }`}
                    >
                      <Text className="text-sm text-white">{r.text}</Text>
                    </Pressable>
                  ))}
                </View>
                <TextInput
                  value={reasonText[child.id] ?? ''}
                  onChangeText={(t) => setReasonText((s) => ({ ...s, [child.id]: t }))}
                  placeholder="New reason (e.g. hiding, shouting)"
                  placeholderTextColor="#5B5FE0"
                  className="rounded-2xl bg-night-900 px-4 py-3 text-white"
                />
                <TextInput
                  value={note[child.id] ?? ''}
                  onChangeText={(t) => setNote((s) => ({ ...s, [child.id]: t }))}
                  placeholder="Optional note"
                  placeholderTextColor="#5B5FE0"
                  className="rounded-2xl bg-night-900 px-4 py-3 text-white"
                />
                <Text className="text-xs text-night-300">{outcomeMessage('bad', badDelta)}</Text>
                <Button label="Save bad night" variant="bad" onPress={() => saveBad(child.id)} />
              </View>
            )}
          </Card>
        );
      })}

      {allReviewed && (
        <Button
          className="mt-2"
          label="Done"
          icon={<Ionicons name="checkmark" size={20} color="#fff" />}
          onPress={() => router.back()}
        />
      )}
    </Screen>
  );
}
