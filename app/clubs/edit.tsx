import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { NavBar } from '@/components/NavBar';
import { Screen } from '@/components/Screen';
import { NumberStepper, TimeStepper } from '@/components/TimeStepper';
import { createClub, deleteClub, getClub, updateClub } from '@/db/repo';
import { childColors } from '@/lib/theme';
import { activeChildren, useStore } from '@/store/useStore';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function EditClub() {
  const params = useLocalSearchParams<{ id?: string }>();
  const editingId = params.id ? Number(params.id) : undefined;
  const existing = editingId ? getClub(editingId) : undefined;
  const refresh = useStore((s) => s.refresh);
  const recordAction = useStore((s) => s.recordAction);
  const kids = activeChildren(useStore((s) => s.children));

  const [name, setName] = useState(existing?.name ?? '');
  const [childId, setChildId] = useState<number | null>(existing?.childId ?? null);
  const [weekday, setWeekday] = useState(existing?.weekday ?? 3); // Wed
  const [start, setStart] = useState(existing?.startMinutes ?? 1035); // 17:15
  const [duration, setDuration] = useState(existing?.durationMinutes ?? 60);
  const [warningLead, setWarningLead] = useState(existing?.warningLeadMinutes ?? 30);
  const [color, setColor] = useState(existing?.color ?? '#38BDF8');

  async function save() {
    if (!name.trim()) {
      Alert.alert('Name required', 'Give the club or activity a name.');
      return;
    }
    const data = {
      name: name.trim(),
      childId,
      weekday,
      startMinutes: start,
      durationMinutes: duration,
      warningLeadMinutes: warningLead,
      color,
    };
    if (editingId) {
      updateClub(editingId, data);
    } else {
      createClub(data);
      if (childId != null) {
        recordAction({
          type: 'club',
          childId,
          ts: Date.now(),
          club: {
            name: data.name,
            weekday,
            startMinutes: start,
            durationMinutes: duration,
            warningLeadMinutes: warningLead,
            color,
          },
        });
      }
    }
    await refresh();
    router.back();
  }

  function confirmDelete() {
    if (!editingId) return;
    Alert.alert('Delete club', `Remove ${existing?.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          deleteClub(editingId);
          await refresh();
          router.back();
        },
      },
    ]);
  }

  return (
    <Screen>
      <NavBar title={editingId ? 'Edit club' : 'Add club'} back />

      <Card>
        <Text className="mb-2 text-sm font-semibold text-night-300">Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Beavers"
          placeholderTextColor="#5B5FE0"
          className="rounded-2xl bg-night-900 px-4 py-3 text-lg text-white"
        />

        <Text className="mb-2 mt-4 text-sm font-semibold text-night-300">Who</Text>
        <View className="flex-row flex-wrap gap-2">
          <Pressable
            onPress={() => setChildId(null)}
            className={`rounded-full px-3 py-2 active:opacity-70 ${
              childId === null ? 'bg-night-400' : 'bg-night-900'
            }`}
          >
            <Text className="text-white">Everyone</Text>
          </Pressable>
          {kids.map((k) => (
            <Pressable
              key={k.id}
              onPress={() => setChildId(k.id)}
              className={`rounded-full px-3 py-2 active:opacity-70 ${
                childId === k.id ? 'bg-night-400' : 'bg-night-900'
              }`}
            >
              <Text className="text-white">{k.name}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card className="mt-4">
        <Text className="mb-2 text-sm font-semibold text-night-300">Day</Text>
        <View className="flex-row flex-wrap gap-2">
          {WEEKDAYS.map((d, i) => (
            <Pressable
              key={d}
              onPress={() => setWeekday(i)}
              className={`h-10 w-12 items-center justify-center rounded-2xl active:opacity-70 ${
                weekday === i ? 'bg-night-400' : 'bg-night-900'
              }`}
            >
              <Text className="text-white">{d}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card className="mt-4 gap-4">
        <TimeStepper label="Start time" value={start} onChange={setStart} />
        <NumberStepper
          label="Duration"
          value={duration}
          onChange={setDuration}
          min={15}
          max={300}
          step={15}
          unit="min"
        />
        <NumberStepper
          label="Warning before"
          value={warningLead}
          onChange={setWarningLead}
          min={0}
          max={120}
          step={5}
          unit="min before"
        />
      </Card>

      <Card className="mt-4">
        <Text className="mb-2 text-sm font-semibold text-night-300">Colour</Text>
        <View className="flex-row flex-wrap gap-3">
          {['#38BDF8', ...childColors].map((c) => (
            <Pressable
              key={c}
              onPress={() => setColor(c)}
              style={{ backgroundColor: c }}
              className={`h-10 w-10 rounded-full ${color === c ? 'border-4 border-white' : ''}`}
            />
          ))}
        </View>
      </Card>

      <View className="mt-6 gap-3">
        <Button label={editingId ? 'Save changes' : 'Add club'} onPress={save} />
        {editingId && (
          <Button
            label="Delete club"
            variant="danger"
            icon={<Ionicons name="trash" size={18} color="#fff" />}
            onPress={confirmDelete}
          />
        )}
      </View>
    </Screen>
  );
}
