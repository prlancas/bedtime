import { type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StarryBackground } from './StarryBackground';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  /** Hide the decorative stars (e.g. for the alarm screen). */
  plain?: boolean;
}

export function Screen({ children, scroll = true, plain = false }: ScreenProps) {
  return (
    <View className="flex-1 bg-night-900">
      {!plain && <StarryBackground />}
      <SafeAreaView className="flex-1" edges={['top', 'left', 'right']}>
        {scroll ? (
          <ScrollView
            className="flex-1"
            contentContainerClassName="px-5 pb-24 pt-2"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          <View className="flex-1 px-5 pt-2">{children}</View>
        )}
      </SafeAreaView>
    </View>
  );
}
