import { NhostProvider } from '@nhost/react';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigationShell } from '@/components/AppNavigationShell';
import { DebugAuthBanner } from '@/components/DebugAuthBanner';
import { setCurrentBetaScreen } from '@/services/betaDiagnostics';
import { nhost } from '@/services/nhostClient';
import { configureNotificationHandling, getRouteFromNotificationData } from '@/services/notificationsService';
import { colors } from '@/theme/tokens';

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    configureNotificationHandling();

    if (Platform.OS === 'web') {
      return;
    }

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const route = getRouteFromNotificationData(response.notification.request.content.data);
      if (route) {
        router.push(route);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

  useEffect(() => {
    setCurrentBetaScreen(pathname ?? null);
  }, [pathname]);

  return (
    <NhostProvider nhost={nhost}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <View style={styles.app}>
          <DebugAuthBanner />
          <View style={styles.stackContainer}>
            <Stack
              screenOptions={{
                headerTitleAlign: 'center',
                headerStyle: {
                  backgroundColor: colors.backgroundRaised,
                },
                headerTintColor: colors.textPrimary,
                headerShadowVisible: false,
                headerTitleStyle: {
                  color: colors.textPrimary,
                },
                contentStyle: {
                  backgroundColor: colors.background,
                },
              }}
            >
              <Stack.Screen name="index" options={{ title: 'Secret Run' }} />
              <Stack.Screen name="(auth)/login" options={{ title: 'Login' }} />
              <Stack.Screen name="(auth)/register" options={{ title: 'Register' }} />
              <Stack.Screen name="home" options={{ title: 'Home' }} />
              <Stack.Screen name="events/index" options={{ title: 'Events' }} />
              <Stack.Screen name="events/[id]" options={{ title: 'Event Details' }} />
              <Stack.Screen name="run/[eventId]" options={{ title: 'Run' }} />
              <Stack.Screen name="feed" options={{ title: 'Feed' }} />
              <Stack.Screen name="profile" options={{ title: 'Profile' }} />
              <Stack.Screen name="leaderboard" options={{ title: 'Leaderboard' }} />
              <Stack.Screen name="teams/index" options={{ title: 'Teams' }} />
            </Stack>
          </View>
          <AppNavigationShell />
        </View>
      </SafeAreaProvider>
    </NhostProvider>
  );
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
    backgroundColor: colors.background,
  },
  stackContainer: {
    flex: 1,
  },
});
