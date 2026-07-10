import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { NavBar } from '@/components/NavBar';
import { Screen } from '@/components/Screen';
import { SoundPicker, TimeStepper } from '@/components/TimeStepper';
import { createChild, deleteChild, getChild, updateChild } from '@/db/repo';
import { childColors } from '@/lib/theme';
import { pickPhoto, takePhoto } from '@/lib/photos';
import { playSound } from '@/lib/sound';
import { useStore } from '@/store/useStore';

export default function EditChild() {
  const params = useLocalSearchParams<{ id?: string }>();
  const editingId = params.id ? Number(params.id) : undefined;
  const existing = editingId ? getChild(editingId) : undefined;
  const refresh = useStore((s) => s.refresh);

  const [name, setName] = useState(existing?.name ?? '');
  const [photoUri, setPhotoUri] = useState<string | null>(existing?.photoUri ?? null);
  const [color, setColor] = useState(existing?.color ?? childColors[0]);
  const [bedtime, setBedtime] = useState(existing?.baseBedtimeMinutes ?? 1170);
  const [warningLead, setWarningLead] = useState(existing?.warningLeadMinutes ?? 10);
  const [warningSound, setWarningSound] = useState(existing?.warningSound ?? 'warning');
  const [bedtimeSound, setBedtimeSound] = useState(existing?.bedtimeSound ?? 'bedtime');

  async function handlePhoto(source: 'camera' | 'library') {
    const uri = source === 'camera' ? await takePhoto() : await pickPhoto();
    if (uri) setPhotoUri(uri);
  }

  async function save() {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a name for the child.');
      return;
    }
    const data = {
      name: name.trim(),
      photoUri,
      color,
      baseBedtimeMinutes: bedtime,
      warningLeadMinutes: warningLead,
      warningSound,
      bedtimeSound,
    };
    if (editingId) updateChild(editingId, data);
    else createChild(data);
    await refresh();
    router.back();
  }

  function confirmDelete() {
    if (!editingId) return;
    Alert.alert('Delete child', `Remove ${existing?.name} and all their history?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          deleteChild(editingId);
          await refresh();
          router.dismissAll();
          router.replace('/kids');
        },
      },
    ]);
  }

  return (
    <Screen>
      <NavBar title={editingId ? 'Edit child' : 'Add child'} back />

      <Card className="items-center">
        <Avatar name={name || '?'} photoUri={photoUri} color={color} size={96} />
        <View className="mt-4 flex-row gap-3">
          <Button
            label="Camera"
            variant="ghost"
            icon={<Ionicons name="camera" size={18} color="#E0E3FF" />}
            onPress={() => handlePhoto('camera')}
          />
          <Button
            label="Gallery"
            variant="ghost"
            icon={<Ionicons name="image" size={18} color="#E0E3FF" />}
            onPress={() => handlePhoto('library')}
          />
          {photoUri && <Button label="Clear" variant="ghost" onPress={() => setPhotoUri(null)} />}
        </View>
      </Card>

      <Card className="mt-4">
        <Text className="mb-2 text-sm font-semibold text-night-300">Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Ava"
          placeholderTextColor="#5B5FE0"
          className="rounded-2xl bg-night-900 px-4 py-3 text-lg text-white"
        />

        <Text className="mb-2 mt-4 text-sm font-semibold text-night-300">Colour</Text>
        <View className="flex-row flex-wrap gap-3">
          {childColors.map((c) => (
            <Pressable
              key={c}
              onPress={() => setColor(c)}
              style={{ backgroundColor: c }}
              className={`h-10 w-10 rounded-full ${color === c ? 'border-4 border-white' : ''}`}
            />
          ))}
        </View>
      </Card>

      <Card className="mt-4 gap-4">
        <TimeStepper label="Bedtime" value={bedtime} onChange={setBedtime} />
        <TimeStepper
          label={`Pre-bedtime warning (${warningLead} min before)`}
          value={warningLead}
          onChange={setWarningLead}
          min={0}
          max={60}
        />
        <Text className="text-xs text-night-300">
          Warning alarm at {warningLead} minutes before bed lets them grab a snack or wind down.
        </Text>
      </Card>

      <Card className="mt-4 gap-4">
        <SoundPicker
          label="Warning sound"
          value={warningSound}
          onChange={setWarningSound}
          onPreview={(v) => playSound(v as 'warning' | 'bedtime')}
        />
        <SoundPicker
          label="Bedtime sound"
          value={bedtimeSound}
          onChange={setBedtimeSound}
          onPreview={(v) => playSound(v as 'warning' | 'bedtime')}
        />
      </Card>

      <View className="mt-6 gap-3">
        <Button label={editingId ? 'Save changes' : 'Add child'} onPress={save} />
        {editingId && <Button label="Delete child" variant="danger" onPress={confirmDelete} />}
      </View>
    </Screen>
  );
}
