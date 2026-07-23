import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { NavBar } from '@/components/NavBar';
import { Screen } from '@/components/Screen';
import { NumberStepper } from '@/components/TimeStepper';
import { addRedemption, getChild, getSettings, listGoals, starBalance } from '@/db/repo';
import { starMoney } from '@/lib/stars';
import { useStore } from '@/store/useStore';

export default function Redeem() {
  const params = useLocalSearchParams<{ childId?: string }>();
  const childId = Number(params.childId);
  const child = getChild(childId);
  const settings = getSettings();
  const refresh = useStore((s) => s.refresh);
  const bal = starBalance(childId);
  const goals = listGoals(true);

  const [goalId, setGoalId] = useState<number | null>(null);
  const [stars, setStars] = useState(Math.min(bal.bank, 10) || 1);
  const [note, setNote] = useState('');

  const symbol = settings.currencySymbol;
  const deficit = stars - bal.bank; // > 0 means this redemption goes into debt
  const willBeInDebt = deficit > 0;
  const recordAction = useStore((s) => s.recordAction);

  function pickGoal(id: number, cost: number, name: string) {
    setGoalId(id);
    setStars(cost);
    if (!note) setNote(name);
  }

  function commit() {
    addRedemption({ childId, stars, goalId, note: note.trim() || undefined });
    recordAction({
      type: 'redeem',
      childId,
      ts: Date.now(),
      stars,
      goalId,
      note: note.trim() || undefined,
    });
    void refresh().then(() => router.back());
  }

  async function save() {
    if (willBeInDebt) {
      Alert.alert(
        '⚠️ Going into debt',
        `${child?.name} only has ${bal.bank} stars. This will leave a balance of -${deficit} stars.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Redeem anyway', style: 'destructive', onPress: commit },
        ],
      );
      return;
    }
    commit();
  }

  if (!child) {
    return (
      <Screen>
        <NavBar title="Redeem" back />
        <Text className="text-night-300">Child not found.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <NavBar title="Redeem stars" subtitle={child.name} back />

      <Card className="items-center">
        <Avatar name={child.name} photoUri={child.photoUri} color={child.color} size={64} />
        <Text className={`mt-3 text-4xl font-black ${bal.bank < 0 ? 'text-bad' : 'text-star'}`}>
          {bal.bank}
        </Text>
        <Text className="text-sm text-night-300">
          stars in the bank · {starMoney(bal.bank, settings.pencePerStar, symbol)}
        </Text>
      </Card>

      {goals.length > 0 && (
        <>
          <Text className="mb-2 mt-6 text-sm font-semibold text-night-300">Spend on a goal</Text>
          <View className="flex-row flex-wrap gap-2">
            {goals.map((g) => {
              const affordable = g.starCost <= bal.bank;
              return (
                <Pressable
                  key={g.id}
                  onPress={() => pickGoal(g.id, g.starCost, g.name)}
                  className={`flex-row items-center gap-2 rounded-2xl px-3 py-2 active:opacity-70 ${
                    goalId === g.id ? 'bg-night-400' : 'bg-night-900'
                  } ${affordable ? '' : 'opacity-40'}`}
                >
                  <Text className="text-base">{g.emoji}</Text>
                  <Text className="text-white">{g.name}</Text>
                  <Text className="text-xs text-star">{g.starCost}★</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      <Card className="mt-6">
        <NumberStepper
          label="Stars to spend"
          value={stars}
          onChange={(v) => {
            setStars(v);
            setGoalId(null);
          }}
          min={1}
          max={9999}
          step={1}
          unit="stars"
        />
      </Card>

      {willBeInDebt && (
        <View className="mt-3 flex-row items-center gap-2 rounded-2xl bg-bad/20 p-3">
          <Ionicons name="warning" size={18} color="#FB7185" />
          <Text className="flex-1 text-sm font-semibold text-bad">
            This puts {child.name} {deficit} stars in debt (balance -{deficit}).
          </Text>
        </View>
      )}

      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="What are they redeeming? (e.g. ice cream)"
        placeholderTextColor="#5B5FE0"
        className="mt-4 rounded-2xl bg-night-900 px-4 py-3 text-white"
      />

      <Button
        className="mt-6"
        label={willBeInDebt ? `Redeem ${stars} (into debt)` : `Redeem ${stars} stars`}
        variant={willBeInDebt ? 'danger' : 'treat'}
        icon={<Ionicons name="cart" size={18} color="#fff" />}
        onPress={save}
      />
    </Screen>
  );
}
