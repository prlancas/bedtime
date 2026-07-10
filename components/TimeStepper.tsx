import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { clamp, formatTime, MINUTES_IN_DAY } from '@/lib/time';

interface TimeStepperProps {
  label?: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}

const STEPS = [
  { delta: -60, label: '-1h' },
  { delta: -15, label: '-15' },
  { delta: -5, label: '-5' },
  { delta: 5, label: '+5' },
  { delta: 15, label: '+15' },
  { delta: 60, label: '+1h' },
];

export function TimeStepper({
  label,
  value,
  onChange,
  min = 0,
  max = MINUTES_IN_DAY - 1,
}: TimeStepperProps) {
  return (
    <View>
      {label ? <Text className="mb-2 text-sm font-semibold text-night-300">{label}</Text> : null}
      <View className="items-center rounded-3xl bg-night-900 p-4">
        <Text className="text-4xl font-black text-moon">{formatTime(value)}</Text>
        <View className="mt-3 flex-row gap-2">
          {STEPS.map((s) => (
            <Pressable
              key={s.label}
              onPress={() => onChange(clamp(value + s.delta, min, max))}
              className="rounded-xl bg-night-700 px-3 py-2 active:opacity-70"
            >
              <Text className="text-xs font-bold text-white">{s.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

export function NumberStepper({
  label,
  value,
  onChange,
  step = 5,
  min = 0,
  max = 240,
  unit = 'min',
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  unit?: string;
}) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="flex-1 text-base text-white">{label}</Text>
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={() => onChange(clamp(value - step, min, max))}
          className="h-9 w-9 items-center justify-center rounded-full bg-night-700 active:opacity-70"
        >
          <Ionicons name="remove" size={18} color="#fff" />
        </Pressable>
        <Text className="w-20 text-center text-lg font-bold text-moon">
          {value} {unit}
        </Text>
        <Pressable
          onPress={() => onChange(clamp(value + step, min, max))}
          className="h-9 w-9 items-center justify-center rounded-full bg-night-700 active:opacity-70"
        >
          <Ionicons name="add" size={18} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

export function SoundPicker({
  label,
  value,
  onChange,
  onPreview,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onPreview: (v: string) => void;
}) {
  const options = ['warning', 'bedtime'];
  return (
    <View>
      <Text className="mb-2 text-sm font-semibold text-night-300">{label}</Text>
      <View className="flex-row gap-2">
        {options.map((opt) => (
          <Pressable
            key={opt}
            onPress={() => {
              onChange(opt);
              onPreview(opt);
            }}
            className={`flex-1 flex-row items-center justify-center gap-2 rounded-2xl px-3 py-3 active:opacity-70 ${
              value === opt ? 'bg-night-400' : 'bg-night-900'
            }`}
          >
            <Ionicons name={opt === 'bedtime' ? 'alarm' : 'notifications'} size={16} color="#fff" />
            <Text className="font-bold capitalize text-white">{opt}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
