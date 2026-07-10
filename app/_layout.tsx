import '../global.css';

import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import notifee, { EventType } from 'react-native-notify-kit';

import { useStore } from '@/store/useStore';
import type { AlarmKind } from '@/lib/alarms';

// Background handler must be registered at module scope so it survives when the
// app is killed and relaunched by an alarm.
notifee.onBackgroundEvent(async () => {
  // The full-screen intent launches the app; routing happens on foreground.
});

function openAlarm(kind: AlarmKind | undefined) {
  router.navigate({ pathname: '/alarm', params: { kind: kind ?? 'bedtime' } });
}

export default function RootLayout() {
  const init = useStore((s) => s.init);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    notifee.getInitialNotification().then((initial) => {
      const kind = initial?.notification?.data?.kind as AlarmKind | undefined;
      if (kind) openAlarm(kind);
    });

    return notifee.onForegroundEvent(({ type, detail }) => {
      const kind = detail.notification?.data?.kind as AlarmKind | undefined;
      if ((type === EventType.PRESS || type === EventType.DELIVERED) && kind) {
        openAlarm(kind);
      }
    });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#1E1B4B' },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen
            name="alarm"
            options={{ presentation: 'fullScreenModal', animation: 'fade' }}
          />
          <Stack.Screen name="assess" options={{ presentation: 'modal' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
