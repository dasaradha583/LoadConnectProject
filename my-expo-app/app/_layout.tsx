import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { NotificationService } from '@/services/notification';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // Initialize push notifications when app starts
    const initNotifications = async () => {
      const notificationService = NotificationService.getInstance();
      await notificationService.initialize();
    };

    initNotifications();

    // Cleanup on unmount
    return () => {
      const notificationService = NotificationService.getInstance();
      notificationService.cleanup();
    };
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="auth/welcome" options={{ headerShown: false }} />
        <Stack.Screen name="auth/register" options={{ title: 'Register' }} />
        <Stack.Screen name="auth/verify" options={{ title: 'Verify' }} />
        <Stack.Screen name="auth/driver-setup" options={{ title: 'Driver Setup' }} />
        <Stack.Screen name="auth/vendor-setup" options={{ title: 'Vendor Setup' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
