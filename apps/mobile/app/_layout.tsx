import { NhostProvider } from '@nhost/react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { DebugAuthBanner } from '@/components/DebugAuthBanner';
import { nhost } from '@/services/nhostClient';

export default function RootLayout() {
  return (
    <NhostProvider nhost={nhost}>
      <StatusBar style="dark" />
      <DebugAuthBanner />
      <Stack screenOptions={{ headerTitleAlign: 'center' }}>
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
    </NhostProvider>
  );
}
