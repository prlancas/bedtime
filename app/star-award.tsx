import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { NavBar } from '@/components/NavBar';
import { Screen } from '@/components/Screen';
import { NumberStepper } from '@/components/TimeStepper';
import { addStarEvent, getChild, getSettings, listStarReasons } from '@/db/repo';
import { useStore } from '@/store/useStore';

export default function StarAward() {
  const params = useLocalSearchParams<{ childId?: string; kind?: string }>();
  const childId = Number(params.childId);
  const kind: 'good' | 'slip' = params.kind === 'slip' ? 'slip' : 'good';
  const child = getChild(childId);
  const settings = getSettings();
  const refresh = useStore((s) => s.refresh);
  const recordAction = useStore((s) => s.recordAction);
  const reasons = listStarReasons(kind);

  const defaultStars = kind === 'good' ? settings.starGoodDefault : settings.starSlipDefault;
  const [stars, setStars] = useState(defaultStars);
  const [reasonText, setReasonText] = useState('');
  const [note, setNote] = useState('');

  const isGood = kind === 'good';

  function pickReason(text: string, remembered: number) {
    setReasonText(text);
    setStars(remembered); // same as last time, still editable below
  }

  async function save() {
    const reason = reasonText.trim() || undefined;
    const noteText = note.trim() || undefined;
    addStarEvent({ childId, kind, stars, reasonText: reason, note: noteText });
    recordAction({
      type: 'star',
      childId,
      ts: Date.now(),
      kind,
      stars,
      reasonText: reason,
      note: noteText,
    });
    await refresh();
    router.back();
  }

  if (!child) {
    return (
      <Screen>
        <NavBar title="Stars" back />
        <Text className="text-night-300">Child not found.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <NavBar title={isGood ? 'Give stars' : 'Slip-up'} subtitle={child.name} back />

      <Card className="items-center">
        <Avatar name={child.name} photoUri={child.photoUri} color={child.color} size={72} />
        <Text className={`mt-3 text-5xl font-black ${isGood ? 'text-star' : 'text-bad'}`}>
          {isGood ? `+${stars}` : `-${stars}`}
        </Text>
        <Text className="text-sm text-night-300">
          {isGood ? 'stars for something great' : 'stars — try to keep it positive!'}
        </Text>
      </Card>

      <Card className="mt-4">
        <NumberStepper
          label="How many stars?"
          value={stars}
          onChange={setStars}
          min={1}
          max={50}
          step={1}
          unit="stars"
        />
      </Card>

      <Text className="mb-2 mt-6 text-sm font-semibold text-night-300">
        {isGood ? 'What did they do well?' : 'What happened?'}
      </Text>
      {reasons.length > 0 && (
        <View className="mb-3 flex-row flex-wrap gap-2">
          {reasons.map((r) => (
            <Pressable
              key={r.id}
              onPress={() => pickReason(r.text, r.defaultStars)}
              className={`flex-row items-center gap-1 rounded-full px-3 py-2 active:opacity-70 ${
                reasonText === r.text ? 'bg-night-400' : 'bg-night-900'
              }`}
            >
              <Text className="text-sm text-white">{r.text}</Text>
              <Text className="text-xs text-star">{r.defaultStars}★</Text>
            </Pressable>
          ))}
        </View>
      )}
      <TextInput
        value={reasonText}
        onChangeText={setReasonText}
        placeholder={isGood ? 'e.g. tidied room, helped a friend' : 'e.g. wouldn’t share'}
        placeholderTextColor="#5B5FE0"
        className="rounded-2xl bg-night-900 px-4 py-3 text-white"
      />
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Optional note"
        placeholderTextColor="#5B5FE0"
        className="mt-3 rounded-2xl bg-night-900 px-4 py-3 text-white"
      />

      <Button
        className="mt-6"
        label={isGood ? `Give ${stars} stars` : `Remove ${stars} stars`}
        variant={isGood ? 'good' : 'bad'}
        icon={<Ionicons name={isGood ? 'star' : 'cloud'} size={18} color="#1E1B4B" />}
        onPress={save}
      />
    </Screen>
  );
}
