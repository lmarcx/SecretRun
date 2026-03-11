import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { EventListItem } from '@/services/eventsService';
import { fetchPublicEvents, getEventErrorMessage } from '@/services/eventsService';

export default function EventsScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const nextEvents = await fetchPublicEvents();
        if (!active) {
          return;
        }

        setEvents(nextEvents);
      } catch (err) {
        if (!active) {
          return;
        }

        setError(getEventErrorMessage(err));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [reloadKey]);

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.info}>Loading events...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.title}>Events</Text>
        <Text style={styles.error}>{error}</Text>
        <Pressable style={styles.secondaryButton} onPress={() => setReloadKey((value) => value + 1)}>
          <Text style={styles.secondaryButtonText}>Retry</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (events.length === 0) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.title}>Events</Text>
        <Text style={styles.info}>No events are available yet.</Text>
        <Pressable style={styles.secondaryButton} onPress={() => setReloadKey((value) => value + 1)}>
          <Text style={styles.secondaryButtonText}>Refresh</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        contentContainerStyle={styles.list}
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push(`/events/${item.id}`)}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardDescription}>{item.description || 'No description provided.'}</Text>
            <View style={styles.meta}>
              <Text style={styles.metaLabel}>Starts</Text>
              <Text style={styles.metaValue}>{formatDateTime(item.startsAt)}</Text>
            </View>
            <View style={styles.meta}>
              <Text style={styles.metaLabel}>Reveal</Text>
              <Text style={styles.metaValue}>{formatDateTime(item.revealAt)}</Text>
            </View>
            <View style={styles.meta}>
              <Text style={styles.metaLabel}>Start area radius</Text>
              <Text style={styles.metaValue}>{item.startAreaRadiusKm} km</Text>
            </View>
          </Pressable>
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Events</Text>
            <Text style={styles.subtitle}>Available Secret Run events from the current backend seed.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString();
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  list: {
    padding: 16,
    gap: 12,
  },
  header: {
    marginBottom: 8,
    gap: 4,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f8fafc',
    gap: 10,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 16,
    color: '#475569',
  },
  info: {
    color: '#475569',
    textAlign: 'center',
  },
  error: {
    color: '#b91c1c',
    textAlign: 'center',
    fontWeight: '600',
  },
  secondaryButton: {
    minHeight: 48,
    minWidth: 160,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 18,
  },
  secondaryButtonText: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
  },
  card: {
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    gap: 10,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  cardDescription: {
    color: '#334155',
  },
  meta: {
    gap: 2,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  metaValue: {
    color: '#0f172a',
  },
});
