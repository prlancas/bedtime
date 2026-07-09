import { Ionicons } from '@expo/vector-icons';
import { type ReactNode, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { getSettings } from '@/db/repo';
import { verifyPin } from '@/lib/pin';
import { Screen } from './Screen';
import { NavBar } from './NavBar';
import { useStore } from '@/store/useStore';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

export function PinGate({ children }: { children: ReactNode }) {
  const settings = getSettings();
  const unlocked = useStore((s) => s.unlocked);
  const setUnlocked = useStore((s) => s.setUnlocked);
  const [entry, setEntry] = useState('');
  const [error, setError] = useState(false);

  if (!settings.pinEnabled || unlocked) return <>{children}</>;

  async function press(key: string) {
    setError(false);
    if (key === 'del') {
      setEntry((e) => e.slice(0, -1));
      return;
    }
    if (!key) return;
    const next = (entry + key).slice(0, 4);
    setEntry(next);
    if (next.length === 4) {
      const ok = await verifyPin(next, settings.pinHash);
      if (ok) {
        setUnlocked(true);
      } else {
        setError(true);
        setEntry('');
      }
    }
  }

  return (
    <Screen scroll={false}>
      <NavBar title="Enter PIN" back />
      <View className="flex-1 items-center justify-center">
        <Ionicons name="lock-closed" size={40} color="#FDE68A" />
        <Text className="mt-3 text-night-300">Enter your parent PIN</Text>
        <View className="my-6 flex-row gap-4">
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              className={`h-4 w-4 rounded-full ${entry.length > i ? 'bg-moon' : 'bg-night-700'}`}
            />
          ))}
        </View>
        {error && <Text className="mb-2 text-bad">Wrong PIN, try again</Text>}
        <View className="w-64 flex-row flex-wrap justify-center gap-3">
          {KEYS.map((k, i) => (
            <Pressable
              key={i}
              onPress={() => press(k)}
              disabled={!k}
              className={`h-16 w-16 items-center justify-center rounded-full ${
                k ? 'bg-night-800 active:opacity-70' : ''
              }`}
            >
              {k === 'del' ? (
                <Ionicons name="backspace" size={22} color="#E0E3FF" />
              ) : (
                <Text className="text-2xl font-bold text-white">{k}</Text>
              )}
            </Pressable>
          ))}
        </View>
      </View>
    </Screen>
  );
}
