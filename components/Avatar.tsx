import { Image, Text, View } from 'react-native';

interface AvatarProps {
  name: string;
  photoUri?: string | null;
  color?: string;
  size?: number;
}

export function Avatar({ name, photoUri, color = '#7A82F5', size = 64 }: AvatarProps) {
  const initials = name
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');

  if (photoUri) {
    return (
      <Image
        source={{ uri: photoUri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        className="border-2 border-white/40"
      />
    );
  }

  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }}
      className="items-center justify-center border-2 border-white/30"
    >
      <Text style={{ fontSize: size * 0.4 }} className="font-black text-white">
        {initials || '?'}
      </Text>
    </View>
  );
}
