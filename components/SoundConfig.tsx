import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder } from 'expo-audio';

import { BUILTIN_SOUNDS, deleteAudio, persistAudio, pickAudioFile, playSound } from '@/lib/sound';

interface Props {
  label: string;
  /** 'warning' | 'bedtime' | ... built-in name, or 'custom' when using a file. */
  sound: string;
  uri: string | null;
  onChange: (sound: string, uri: string | null) => void;
}

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  warning: 'notifications',
  bedtime: 'alarm',
};

export function SoundConfig({ label, sound, uri, onChange }: Props) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recording, setRecording] = useState(false);

  async function startRecording() {
    const perm = await AudioModule.requestRecordingPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Microphone needed', 'Allow microphone access to record a custom sound.');
      return;
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setRecording(true);
  }

  async function stopRecording() {
    try {
      await recorder.stop();
    } finally {
      setRecording(false);
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
    }
    if (recorder.uri) {
      const stored = persistAudio(recorder.uri);
      if (sound === 'custom') deleteAudio(uri);
      onChange('custom', stored);
    }
  }

  async function upload() {
    const picked = await pickAudioFile();
    if (picked) {
      if (sound === 'custom') deleteAudio(uri);
      onChange('custom', picked);
    }
  }

  function selectBuiltin(name: string) {
    if (sound === 'custom') deleteAudio(uri);
    onChange(name, null);
    playSound({ builtin: name });
  }

  function preview() {
    if (sound === 'custom' && uri) playSound({ uri });
    else playSound({ builtin: sound });
  }

  return (
    <View>
      <Text className="mb-2 text-sm font-semibold text-night-300">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {BUILTIN_SOUNDS.map((opt) => (
          <Pressable
            key={opt}
            onPress={() => selectBuiltin(opt)}
            className={`flex-row items-center gap-2 rounded-2xl px-3 py-3 active:opacity-70 ${
              sound === opt ? 'bg-night-400' : 'bg-night-900'
            }`}
          >
            <Ionicons name={ICONS[opt] ?? 'musical-note'} size={16} color="#fff" />
            <Text className="font-bold capitalize text-white">{opt}</Text>
          </Pressable>
        ))}
        <Pressable
          onPress={recording ? stopRecording : startRecording}
          className={`flex-row items-center gap-2 rounded-2xl px-3 py-3 active:opacity-70 ${
            recording ? 'bg-rose-500' : 'bg-night-900'
          }`}
        >
          <Ionicons name={recording ? 'stop' : 'mic'} size={16} color="#fff" />
          <Text className="font-bold text-white">{recording ? 'Stop' : 'Record'}</Text>
        </Pressable>
        <Pressable
          onPress={upload}
          className="flex-row items-center gap-2 rounded-2xl bg-night-900 px-3 py-3 active:opacity-70"
        >
          <Ionicons name="cloud-upload" size={16} color="#fff" />
          <Text className="font-bold text-white">Upload</Text>
        </Pressable>
      </View>

      {sound === 'custom' && (
        <View className="mt-2 flex-row items-center gap-2 rounded-2xl bg-night-400 px-3 py-2">
          <Ionicons name="musical-notes" size={16} color="#fff" />
          <Text className="flex-1 text-white">Custom clip selected</Text>
        </View>
      )}

      <Pressable onPress={preview} className="mt-2 flex-row items-center gap-2 active:opacity-70">
        <Ionicons name="play-circle" size={18} color="#A0A9FF" />
        <Text className="text-sm text-moon">Preview</Text>
      </Pressable>
    </View>
  );
}
