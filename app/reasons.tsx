import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { NavBar } from '@/components/NavBar';
import { PinGate } from '@/components/PinGate';
import { Screen } from '@/components/Screen';
import { addReason, deleteReason, listReasons, reasonStats } from '@/db/repo';

export default function Reasons() {
  return (
    <PinGate>
      <ReasonsInner />
    </PinGate>
  );
}

function ReasonsInner() {
  const [text, setText] = useState('');
  const [, setTick] = useState(0);
  const reasons = listReasons();
  const stats = new Map(reasonStats().map((s) => [s.reason, s.count]));

  function add() {
    if (!text.trim()) return;
    addReason(text);
    setText('');
    setTick((t) => t + 1);
  }

  function remove(id: number) {
    deleteReason(id);
    setTick((t) => t + 1);
  }

  return (
    <Screen>
      <NavBar title="Reasons" subtitle="Reusable bad-bedtime reasons" back />

      <View className="mb-4 flex-row gap-2">
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Add a reason (e.g. hiding)"
          placeholderTextColor="#5B5FE0"
          className="flex-1 rounded-2xl bg-night-900 px-4 py-3 text-white"
          onSubmitEditing={add}
        />
        <Button label="Add" onPress={add} />
      </View>

      {reasons.length === 0 ? (
        <Text className="text-night-300">
          No reasons yet. They&apos;re added automatically when you type one during a review.
        </Text>
      ) : (
        reasons.map((r) => (
          <View
            key={r.id}
            className="mb-2 flex-row items-center gap-3 rounded-2xl bg-night-800/70 p-3"
          >
            <Ionicons name="pricetag" size={18} color="#A0A9FF" />
            <Text className="flex-1 text-white">{r.text}</Text>
            <View className="rounded-full bg-night-900 px-2 py-1">
              <Text className="text-xs text-night-300">used {stats.get(r.text) ?? 0}x</Text>
            </View>
            <Pressable onPress={() => remove(r.id)} className="p-1 active:opacity-70">
              <Ionicons name="trash" size={18} color="#FB7185" />
            </Pressable>
          </View>
        ))
      )}
    </Screen>
  );
}
