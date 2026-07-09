import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';

interface NavBarProps {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void }[];
}

export function NavBar({ title, subtitle, back, right }: NavBarProps) {
  return (
    <View className="mb-4 flex-row items-center justify-between">
      <View className="flex-1 flex-row items-center gap-3">
        {back && (
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full bg-night-800 active:opacity-70"
          >
            <Ionicons name="chevron-back" size={22} color="#E0E3FF" />
          </Pressable>
        )}
        <View className="flex-1">
          <Text className="text-2xl font-black text-white">{title}</Text>
          {subtitle ? <Text className="text-sm text-night-300">{subtitle}</Text> : null}
        </View>
      </View>
      <View className="flex-row gap-2">
        {right?.map((r) => (
          <Pressable
            key={r.icon}
            onPress={r.onPress}
            className="h-10 w-10 items-center justify-center rounded-full bg-night-800 active:opacity-70"
          >
            <Ionicons name={r.icon} size={20} color="#E0E3FF" />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
