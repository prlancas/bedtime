import { type ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';

type Variant = 'primary' | 'good' | 'bad' | 'treat' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, { bg: string; text: string }> = {
  primary: { bg: 'bg-night-400', text: 'text-white' },
  good: { bg: 'bg-good', text: 'text-night-900' },
  bad: { bg: 'bg-bad', text: 'text-night-900' },
  treat: { bg: 'bg-treat', text: 'text-night-900' },
  danger: { bg: 'bg-bad', text: 'text-white' },
  ghost: { bg: 'bg-night-800', text: 'text-night-100' },
};

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  className = '',
}: ButtonProps) {
  const v = VARIANTS[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`flex-row items-center justify-center gap-2 rounded-2xl px-5 py-4 active:opacity-80 ${v.bg} ${
        disabled ? 'opacity-40' : ''
      } ${className}`}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <>
          {icon}
          <Text className={`text-base font-bold ${v.text}`}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}
