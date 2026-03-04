import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { RouteMap } from '@/components/RouteMap';
import { useEventRoute } from '@/hooks/useEventRoute';
import { useTrackpointSync } from '@/hooks/useTrackpointSync';

export default function RunScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { route, loading, error } = useEventRoute(eventId);

  useTrackpointSync(eventId);

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.info}>Loading route...</Text>
      </SafeAreaView>
    );
  }

  if (error || !route) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.title}>Run</Text>
        <Text style={styles.info}>{error ?? 'No route available'}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Live Run</Text>
        <Text style={styles.info}>Tracking enabled. Sending trackpoints every 5 seconds.</Text>
      </View>
      <View style={styles.mapWrapper}>
        <RouteMap polyline={route.polyline} startPoint={route.startPoint} endPoint={route.endPoint} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
    gap: 12,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 16,
    gap: 8,
  },
  header: {
    gap: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
  },
  info: {
    color: '#334155',
    textAlign: 'center',
  },
  mapWrapper: {
    flex: 1,
  },
});
