import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { NavBar } from '@/components/NavBar';
import { PinGate } from '@/components/PinGate';
import { Screen } from '@/components/Screen';
import { NumberStepper } from '@/components/TimeStepper';
import { addGoal, deleteGoal, getSettings, listGoals, updateGoal, updateSettings } from '@/db/repo';
import { starsToPence, formatMoney } from '@/lib/stars';
import { useStore } from '@/store/useStore';

const EMOJIS = ['🎁', '🍦', '🧸', '🎮', '📚', '🍫', '🎨', '⚽', '🚲', '🎬', '🧁', '💷'];

export default function Goals() {
  return (
    <PinGate>
      <GoalsInner />
    </PinGate>
  );
}

function GoalsInner() {
  const stored = getSettings();
  const reload = useStore((s) => s.reload);
  const [, setTick] = useState(0);
  const refreshLocal = () => setTick((t) => t + 1);

  const [pence, setPence] = useState(stored.pencePerStar);
  const [symbol, setSymbol] = useState(stored.currencySymbol);
  const [goodDefault, setGoodDefault] = useState(stored.starGoodDefault);
  const [slipDefault, setSlipDefault] = useState(stored.starSlipDefault);

  const [name, setName] = useState('');
  const [cost, setCost] = useState(20);
  const [emoji, setEmoji] = useState('🎁');

  const goals = listGoals(false);

  function saveEconomy() {
    updateSettings({
      pencePerStar: pence,
      currencySymbol: symbol || '£',
      starGoodDefault: goodDefault,
      starSlipDefault: slipDefault,
    });
    reload();
    refreshLocal();
  }

  function add() {
    if (!name.trim()) return;
    addGoal(name, cost, emoji);
    setName('');
    setCost(20);
    setEmoji('🎁');
    refreshLocal();
  }

  return (
    <Screen>
      <NavBar title="Rewards & goals" subtitle="Star value and things to save for" back />

      <Text className="mb-2 text-lg font-bold text-white">Star value</Text>
      <Card className="gap-4">
        <NumberStepper
          label="Each star is worth"
          value={pence}
          onChange={setPence}
          min={0}
          max={100}
          step={1}
          unit="p"
        />
        <View className="flex-row items-center justify-between">
          <Text className="text-base text-white">Currency symbol</Text>
          <TextInput
            value={symbol}
            onChangeText={(t) => setSymbol(t.slice(0, 2))}
            placeholder="£"
            placeholderTextColor="#5B5FE0"
            className="w-20 rounded-2xl bg-night-900 px-4 py-2 text-center text-lg text-white"
          />
        </View>
        <Text className="text-xs text-night-300">
          10 stars = {formatMoney(starsToPence(10, pence), symbol || '£')}. Save goals higher to
          stretch it out.
        </Text>
        <NumberStepper
          label="Default stars for a good deed"
          value={goodDefault}
          onChange={setGoodDefault}
          min={1}
          max={20}
          step={1}
          unit="stars"
        />
        <NumberStepper
          label="Default stars lost for a slip-up"
          value={slipDefault}
          onChange={setSlipDefault}
          min={1}
          max={20}
          step={1}
          unit="stars"
        />
        <Button
          label="Save star settings"
          icon={<Ionicons name="save" size={18} color="#fff" />}
          onPress={saveEconomy}
        />
      </Card>

      <Text className="mb-2 mt-6 text-lg font-bold text-white">Goals</Text>
      <Card className="gap-3">
        <View className="flex-row flex-wrap gap-2">
          {EMOJIS.map((e) => (
            <Pressable
              key={e}
              onPress={() => setEmoji(e)}
              className={`h-10 w-10 items-center justify-center rounded-full ${
                emoji === e ? 'bg-night-400' : 'bg-night-900'
              }`}
            >
              <Text className="text-lg">{e}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Reward name (e.g. Ice cream)"
          placeholderTextColor="#5B5FE0"
          className="rounded-2xl bg-night-900 px-4 py-3 text-white"
        />
        <NumberStepper
          label="Cost"
          value={cost}
          onChange={setCost}
          min={1}
          max={1000}
          step={5}
          unit="stars"
        />
        <Text className="text-xs text-night-300">
          {emoji} {name || 'Reward'} = {cost} stars (
          {formatMoney(starsToPence(cost, pence), symbol)})
        </Text>
        <Button label="Add goal" onPress={add} />
      </Card>

      <View className="mt-4 gap-2">
        {goals.map((g) => (
          <View
            key={g.id}
            className={`flex-row items-center gap-3 rounded-2xl bg-night-800/70 p-3 ${
              g.active ? '' : 'opacity-50'
            }`}
          >
            <Text className="text-2xl">{g.emoji}</Text>
            <View className="flex-1">
              <Text className="text-white">{g.name}</Text>
              <Text className="text-xs text-night-300">
                {g.starCost} stars · {formatMoney(starsToPence(g.starCost, pence), symbol)}
              </Text>
            </View>
            <Pressable
              onPress={() => {
                updateGoal(g.id, { active: !g.active });
                refreshLocal();
              }}
              className="p-1 active:opacity-70"
            >
              <Ionicons
                name={g.active ? 'eye' : 'eye-off'}
                size={18}
                color={g.active ? '#A0A9FF' : '#5B5FE0'}
              />
            </Pressable>
            <Pressable
              onPress={() => {
                deleteGoal(g.id);
                refreshLocal();
              }}
              className="p-1 active:opacity-70"
            >
              <Ionicons name="trash" size={18} color="#FB7185" />
            </Pressable>
          </View>
        ))}
      </View>
    </Screen>
  );
}
