import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Switch, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { NavBar } from '@/components/NavBar';
import { PinGate } from '@/components/PinGate';
import { Screen } from '@/components/Screen';
import { NumberStepper, TimeStepper } from '@/components/TimeStepper';
import { getSettings, updateSettings } from '@/db/repo';
import { scheduleAllAlarms } from '@/lib/alarms';
import { hashPin } from '@/lib/pin';
import { useStore } from '@/store/useStore';

export default function Settings() {
  return (
    <PinGate>
      <SettingsInner />
    </PinGate>
  );
}

function SettingsInner() {
  const stored = getSettings();
  const reload = useStore((s) => s.reload);
  const setUnlocked = useStore((s) => s.setUnlocked);

  const [goodDelta, setGoodDelta] = useState(stored.goodDeltaMinutes);
  const [badDelta, setBadDelta] = useState(stored.badDeltaMinutes);
  const [fri, setFri] = useState(stored.fridayOffsetMinutes);
  const [sat, setSat] = useState(stored.saturdayOffsetMinutes);
  const [minB, setMinB] = useState(stored.minBedtimeMinutes);
  const [maxB, setMaxB] = useState(stored.maxBedtimeMinutes);
  const [pinEnabled, setPinEnabled] = useState(stored.pinEnabled);
  const [pin, setPin] = useState('');

  async function save() {
    if (minB >= maxB) {
      Alert.alert('Check bedtime window', 'Earliest bedtime must be before the latest bedtime.');
      return;
    }
    let pinHash = stored.pinHash;
    if (pinEnabled) {
      if (!pinHash || pin.length === 4) {
        if (pin.length !== 4) {
          Alert.alert('Set a PIN', 'Enter a 4-digit PIN to protect settings.');
          return;
        }
        pinHash = await hashPin(pin);
      }
    } else {
      pinHash = null;
    }

    updateSettings({
      goodDeltaMinutes: goodDelta,
      badDeltaMinutes: badDelta,
      fridayOffsetMinutes: fri,
      saturdayOffsetMinutes: sat,
      minBedtimeMinutes: minB,
      maxBedtimeMinutes: maxB,
      pinEnabled,
      pinHash,
    });
    reload();
    await scheduleAllAlarms();
    if (!pinEnabled) setUnlocked(false);
    Alert.alert('Saved', 'Settings updated and alarms rescheduled.');
    router.back();
  }

  return (
    <Screen>
      <NavBar title="Settings" back />

      <Text className="mb-2 text-lg font-bold text-white">Bedtime adjustments</Text>
      <Card className="gap-4">
        <NumberStepper
          label="Later after a good night (y)"
          value={goodDelta}
          onChange={setGoodDelta}
          max={60}
        />
        <NumberStepper
          label="Earlier after a bad night (x)"
          value={badDelta}
          onChange={setBadDelta}
          max={60}
        />
        <Text className="text-xs text-night-300">
          Treats add {goodDelta} min later; penalties take {badDelta} min off.
        </Text>
      </Card>

      <Text className="mb-2 mt-6 text-lg font-bold text-white">Bedtime window</Text>
      <Card className="gap-4">
        <TimeStepper label="Earliest bedtime" value={minB} onChange={setMinB} />
        <TimeStepper label="Latest bedtime" value={maxB} onChange={setMaxB} />
        <Text className="text-xs text-night-300">
          Bedtimes never drift outside this window (weekend offsets can go later).
        </Text>
      </Card>

      <Text className="mb-2 mt-6 text-lg font-bold text-white">Advanced · weekend offsets</Text>
      <Card className="gap-4">
        <NumberStepper
          label="Friday night later by"
          value={fri}
          onChange={setFri}
          max={180}
          step={15}
        />
        <NumberStepper
          label="Saturday night later by"
          value={sat}
          onChange={setSat}
          max={180}
          step={15}
        />
        <Text className="text-xs text-night-300">
          Non-school nights: kids can stay up this much later on Fri/Sat.
        </Text>
      </Card>

      <Text className="mb-2 mt-6 text-lg font-bold text-white">Security</Text>
      <Card className="gap-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-base text-white">Require PIN for settings & reviews</Text>
          <Switch value={pinEnabled} onValueChange={setPinEnabled} />
        </View>
        {pinEnabled && (
          <TextInput
            value={pin}
            onChangeText={(t) => setPin(t.replace(/[^0-9]/g, '').slice(0, 4))}
            placeholder={stored.pinHash ? 'Enter new 4-digit PIN to change' : 'Set a 4-digit PIN'}
            placeholderTextColor="#5B5FE0"
            keyboardType="number-pad"
            secureTextEntry
            className="rounded-2xl bg-night-900 px-4 py-3 text-lg text-white"
          />
        )}
      </Card>

      <View className="mt-6 gap-3">
        <Button
          label="Manage reasons"
          variant="ghost"
          icon={<Ionicons name="list" size={18} color="#E0E3FF" />}
          onPress={() => router.push('/reasons')}
        />
        <Button
          label="Save settings"
          icon={<Ionicons name="save" size={18} color="#fff" />}
          onPress={save}
        />
      </View>
    </Screen>
  );
}
