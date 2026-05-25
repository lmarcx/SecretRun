import { NhostProvider } from '@nhost/react';
import { Stack, usePathname, useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Syne_700Bold, Syne_800ExtraBold } from '@expo-google-fonts/syne';
import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold } from '@expo-google-fonts/dm-sans';
import { NavBar } from '@/components/NavBar';
import { DebugAuthBanner } from '@/components/DebugAuthBanner';
import { useAuth } from '@/hooks/useAuth';
import { setCurrentBetaScreen } from '@/services/betaDiagnostics';
import { nhost } from '@/services/nhostClient';
import { configureNotificationHandling, getRouteFromNotificationData } from '@/services/notificationsService';
import { colors } from '@/theme/tokens';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Syne_700Bold,
    Syne_800ExtraBold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
  });

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <NhostProvider nhost={nhost}>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <AppChrome />
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </NhostProvider>
  );
}

function AppChrome() {
  const router = useRouter();
  const pathname = usePathname();
  const { betaAccessState, isAvailable } = useAuth();
  const authRoute = pathname === '/login' || pathname === '/register';
  const guestRoute = isGuestAccessibleRoute(pathname);

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

  useEffect(() => {
    if (!isAvailable || betaAccessState === 'loading' || betaAccessState === 'dev_runner' || betaAccessState === 'auth_unavailable') {
      return;
    }

    if ((betaAccessState === 'signed_out' || betaAccessState === 'beta_blocked') && !authRoute && !guestRoute) {
      router.replace({ pathname: '/(auth)/login', params: { redirectTo: pathname } });
      return;
    }

    if (betaAccessState === 'signed_in' && authRoute) {
      router.replace('/events');
    }
  }, [authRoute, betaAccessState, guestRoute, isAvailable, router]);

  return (
    <>
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
                fontWeight: '700',
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
            <Stack.Screen name="settings" options={{ title: 'Settings' }} />
            <Stack.Screen name="leaderboard" options={{ title: 'Leaderboard' }} />
            <Stack.Screen name="teams/index" options={{ title: 'Teams' }} />
            <Stack.Screen name="teams/[id]" options={{ title: 'Team' }} />
          </Stack>
        </View>
        <NavBar />
      </View>
    </>
  );
}

function isGuestAccessibleRoute(pathname: string | null | undefined) {
  if (!pathname) {
    return false;
  }

  return pathname === '/' || pathname === '/events' || pathname.startsWith('/events/') || pathname === '/leaderboard';
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
