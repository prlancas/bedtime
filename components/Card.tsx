import { type ReactNode } from 'react';
import { View } from 'react-native';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <View className={`rounded-3xl bg-night-800/80 p-5 ${className}`}>{children}</View>;
}
