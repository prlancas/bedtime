import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { NavBar } from '@/components/NavBar';
import { PinkyPromise } from '@/components/PinkyPromise';
import { Screen } from '@/components/Screen';
import { addPromise, deletePromise, getChild, listPromises, setPromiseKept } from '@/db/repo';
import { formatDate } from '@/lib/time';
import { useStore } from '@/store/useStore';

export default function Promise() {
  const params = useLocalSearchParams<{ childId?: string }>();
  const childId = Number(params.childId);
  const child = getChild(childId);
  const refresh = useStore((s) => s.refresh);
  const recordAction = useStore((s) => s.recordAction);

  const [text, setText] = useState('');
  const [sealed, setSealed] = useState(false);
  const [, setTick] = useState(0);
  const bump = () => setTick((t) => t + 1);

  const promises = Number.isFinite(childId) ? listPromises(childId) : [];

  async function seal() {
    if (!text.trim()) {
      Alert.alert('What’s the promise?', 'Type the promise first, then tap the pinky to seal it.');
      return;
    }
    addPromise(childId, text);
    recordAction({ type: 'promise', childId, ts: Date.now(), text: text.trim() });
    setSealed(true);
    await refresh();
    bump();
  }

  function another() {
    setText('');
    setSealed(false);
  }

  if (!child) {
    return (
      <Screen>
        <NavBar title="Pinky promise" back />
        <Text className="text-night-300">Child not found.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <NavBar title="Pinky promise" subtitle={child.name} back />

      <Card className="gap-4">
        <TextInput
          value={text}
          onChangeText={setText}
          editable={!sealed}
          multiline
          placeholder="e.g. I promise not to moan about swimming next week"
          placeholderTextColor="#5B5FE0"
          className="min-h-[64px] rounded-2xl bg-night-900 px-4 py-3 text-base text-white"
        />
        <PinkyPromise sealed={sealed} onSeal={seal} />
        {sealed && (
          <Button
            label="Make another"
            variant="ghost"
            icon={<Ionicons name="add" size={18} color="#E0E3FF" />}
            onPress={another}
          />
        )}
      </Card>

      <Text className="mb-2 mt-6 text-lg font-bold text-white">Promise log</Text>
      {promises.length === 0 ? (
        <Text className="text-night-300">No promises yet. Seal one above!</Text>
      ) : (
        promises.map((p) => (
          <Card key={p.id} className="mb-2">
            <View className="flex-row items-start gap-2">
              <Text className="text-lg">🤙</Text>
              <View className="flex-1">
                <Text className="text-white">{p.text}</Text>
                <Text className="mt-1 text-xs text-night-300">
                  {formatDate(new Date(p.createdAt))}
                  {p.kept === true ? ' · Kept ✅' : p.kept === false ? ' · Broken 💔' : ''}
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  deletePromise(p.id);
                  bump();
                }}
                className="p-1"
              >
                <Ionicons name="trash" size={16} color="#FB7185" />
              </Pressable>
            </View>
            {p.kept == null && (
              <View className="mt-3 flex-row gap-2">
                <View className="flex-1">
                  <Button
                    label="Kept it"
                    variant="good"
                    onPress={() => {
                      setPromiseKept(p.id, true);
                      bump();
                    }}
                  />
                </View>
                <View className="flex-1">
                  <Button
                    label="Broke it"
                    variant="bad"
                    onPress={() => {
                      setPromiseKept(p.id, false);
                      bump();
                    }}
                  />
                </View>
              </View>
            )}
          </Card>
        ))
      )}
    </Screen>
  );
}
