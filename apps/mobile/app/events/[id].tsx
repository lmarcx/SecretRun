import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { EventDetail } from '@/services/eventsService';
import { fetchEventDetails, getEventErrorMessage, joinEvent } from '@/services/eventsService';

export default function EventDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinLoading, setJoinLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!id) {
        setError('Missing event id');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const nextEvent = await fetchEventDetails(id);
        if (!active) {
          return;
        }

        if (!nextEvent) {
          setError('Event not found.');
          setEvent(null);
        } else {
          setEvent(nextEvent);
        }
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
  }, [id]);

  const handleJoin = async () => {
    if (!id) {
      return;
    }

    if (event?.viewerParticipationStatus) {
      setFeedback({ type: 'success', message: 'You are already registered for this event.' });
      return;
    }

    setJoinLoading(true);
    setFeedback(null);

    try {
      await joinEvent(id);
      const refreshed = await fetchEventDetails(id);
      setEvent(refreshed);
      setFeedback({ type: 'success', message: 'Event joined successfully.' });
    } catch (err) {
      setFeedback({ type: 'error', message: getEventErrorMessage(err) });
    } finally {
      setJoinLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.subtitle}>Loading event details...</Text>
      </SafeAreaView>
    );
  }

  if (error || !event) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.title}>Event</Text>
        <Text style={styles.error}>{error ?? 'Event not found.'}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{event.title}</Text>
        <Text style={styles.description}>{event.description || 'No description provided.'}</Text>

        <View style={styles.section}>
          <Text style={styles.label}>Starts at</Text>
          <Text style={styles.value}>{formatDateTime(event.startsAt)}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Reveal at</Text>
          <Text style={styles.value}>{formatDateTime(event.revealAt)}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Start area radius</Text>
          <Text style={styles.value}>{event.startAreaRadiusKm} km</Text>
        </View>

        {event.participantCount !== null ? (
          <View style={styles.section}>
            <Text style={styles.label}>Participants</Text>
            <Text style={styles.value}>{event.participantCount}</Text>
          </View>
        ) : null}

        {feedback ? (
          <Text style={feedback.type === 'success' ? styles.success : styles.error}>{feedback.message}</Text>
        ) : null}

        <Pressable
          style={[styles.button, (joinLoading || Boolean(event.viewerParticipationStatus)) && styles.buttonDisabled]}
          onPress={handleJoin}
          disabled={joinLoading}
        >
          <Text style={styles.buttonText}>
            {event.viewerParticipationStatus ? 'Joined' : joinLoading ? 'Joining...' : 'Join event'}
          </Text>
        </Pressable>
      </ScrollView>
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
  container: {
    padding: 20,
    gap: 14,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 10,
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#0f172a',
  },
  description: {
    color: '#334155',
    fontSize: 16,
  },
  subtitle: {
    color: '#334155',
    textAlign: 'center',
  },
  section: {
    gap: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  value: {
    color: '#0f172a',
    fontSize: 16,
  },
  button: {
    marginTop: 8,
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttonDisabled: {
    backgroundColor: '#475569',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  success: {
    color: '#166534',
    fontWeight: '600',
  },
  error: {
    color: '#b91c1c',
    fontWeight: '600',
    textAlign: 'center',
  },
});
