import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RouteMap } from '@/components/RouteMap';
import { useAuth } from '@/hooks/useAuth';
import { getEffectiveRunner, isDevRunnerActive } from '@/services/devRunnerMode';
import { fetchEventRoute } from '@/services/eventRoutes';
import type { EventDetail } from '@/services/eventsService';
import { fetchEventDetails, getEventErrorMessage, joinEvent } from '@/services/eventsService';
import { getStoredRunSession } from '@/services/runSessionStore';
import type { EventRoute } from '@/utils/route';

export default function EventDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinLoading, setJoinLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [route, setRoute] = useState<EventRoute | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const eventId = Array.isArray(id) ? id[0] : id;
  const routeRevealed = event ? new Date(event.revealAt).getTime() <= Date.now() : false;
  const eventStarted = event ? new Date(event.startsAt).getTime() <= Date.now() : false;
  const devRunnerActive = isDevRunnerActive();
  const effectiveRunner = getEffectiveRunner();
  const storedRunSession = eventId ? getStoredRunSession(eventId) : null;
  const hasFinishedRun = storedRunSession?.phase === 'completed';
  const canOpenRun = Boolean(event?.viewerParticipationStatus === 'registered' && (devRunnerActive || (routeRevealed && eventStarted)));

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!eventId) {
        setError('Missing event id');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const nextEvent = await fetchEventDetails(eventId);
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
  }, [eventId, isAuthenticated, reloadKey]);

  useEffect(() => {
    let active = true;

    if (!event || !routeRevealed || !eventId) {
      setRoute(null);
      setRouteError(null);
      setRouteLoading(false);
      return () => {
        active = false;
      };
    }

    const loadRoute = async () => {
      setRouteLoading(true);
      setRouteError(null);

      try {
        const nextRoute = await fetchEventRoute(eventId);
        if (!active) {
          return;
        }

        if (!nextRoute) {
          setRoute(null);
          setRouteError('The route should be revealed now, but route details are not available yet.');
        } else {
          setRoute(nextRoute);
        }
      } catch (err) {
        if (!active) {
          return;
        }

        setRoute(null);
        setRouteError(err instanceof Error ? err.message : 'Failed to load the route.');
      } finally {
        if (active) {
          setRouteLoading(false);
        }
      }
    };

    void loadRoute();

    return () => {
      active = false;
    };
  }, [event, eventId, reloadKey, routeRevealed]);

  const handleJoin = async () => {
    if (!eventId) {
      return;
    }

    if (!isAuthenticated && !devRunnerActive) {
      router.push('/(auth)/login');
      return;
    }

    if (event?.viewerParticipationStatus) {
      setFeedback({ type: 'success', message: 'You are already registered for this event.' });
      return;
    }

    setJoinLoading(true);
    setFeedback(null);

    try {
      const result = await joinEvent(eventId);
      const refreshed = await fetchEventDetails(eventId);
      setEvent(refreshed);
      setFeedback({
        type: 'success',
        message: result === 'already_joined' ? 'You are already registered for this event.' : 'Event joined successfully.',
      });
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
        <Pressable style={styles.secondaryButton} onPress={() => setReloadKey((value) => value + 1)}>
          <Text style={styles.secondaryButtonText}>Retry</Text>
        </Pressable>
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

        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>Start area info</Text>
          <Text style={styles.infoCardText}>
            Meet inside the approximate start zone before kickoff. The detailed route stays hidden until reveal time.
          </Text>
        </View>

        {devRunnerActive ? (
          <View style={styles.devModeCard}>
            <Text style={styles.devModeTitle}>DEV MODE</Text>
            <Text style={styles.infoCardText}>{effectiveRunner?.username ?? 'Dev Runner'} is active locally without authentication.</Text>
          </View>
        ) : null}

        {!routeRevealed ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>Route not revealed yet</Text>
            <Text style={styles.infoCardText}>The route will unlock after {formatDateTime(event.revealAt)}.</Text>
          </View>
        ) : routeLoading ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>Loading route</Text>
            <Text style={styles.infoCardText}>Fetching the revealed route now.</Text>
          </View>
        ) : routeError || !route ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>No route yet</Text>
            <Text style={styles.infoCardText}>{routeError ?? 'Route details are not available yet.'}</Text>
          </View>
        ) : (
          <>
            <View style={styles.mapCard}>
              <RouteMap
                routePolyline={route.polyline}
                startPoint={route.startPoint}
                endPoint={route.endPoint}
                startZoneCenter={event.startAreaCenter}
                startZoneRadiusKm={event.startAreaRadiusKm}
              />
            </View>
          </>
        )}

        <View style={styles.section}>
          <Text style={styles.label}>Participation</Text>
          <Text style={styles.value}>
            {isAuthenticated || devRunnerActive ? event.viewerParticipationStatus ?? 'Not joined yet' : 'Sign in to see your status'}
          </Text>
        </View>

        {event.viewerJoinedAt ? (
          <View style={styles.section}>
            <Text style={styles.label}>Joined at</Text>
            <Text style={styles.value}>{formatDateTime(event.viewerJoinedAt)}</Text>
          </View>
        ) : null}

        {event.participantCount !== null ? (
          <View style={styles.section}>
            <Text style={styles.label}>Participants</Text>
            <Text style={styles.value}>{event.participantCount}</Text>
          </View>
        ) : null}

        {feedback ? (
          <Text style={feedback.type === 'success' ? styles.success : styles.error}>{feedback.message}</Text>
        ) : null}

        {event.viewerParticipationStatus === 'registered' && !devRunnerActive && !routeRevealed ? (
          <Text style={styles.infoHint}>Start Run becomes available once the route is revealed.</Text>
        ) : null}

        {event.viewerParticipationStatus === 'registered' && !devRunnerActive && routeRevealed && !eventStarted ? (
          <Text style={styles.infoHint}>Start Run becomes available when the event starts.</Text>
        ) : null}

        {hasFinishedRun ? (
          <Pressable style={styles.button} onPress={() => router.push(`/run/${event.id}`)}>
            <Text style={styles.buttonText}>View Activity</Text>
          </Pressable>
        ) : event.viewerParticipationStatus === 'registered' ? (
          <Pressable style={[styles.button, !canOpenRun && styles.buttonDisabled]} onPress={() => router.push(`/run/${event.id}`)} disabled={!canOpenRun}>
            <Text style={styles.buttonText}>Start Run</Text>
          </Pressable>
        ) : null}

        {!event.viewerParticipationStatus ? (
          <Pressable style={[styles.button, joinLoading && styles.buttonDisabled]} onPress={handleJoin} disabled={joinLoading}>
            <Text style={styles.buttonText}>
              {!isAuthenticated && devRunnerActive ? (joinLoading ? 'Joining...' : 'Join (Dev Mode)') : !isAuthenticated ? 'Sign in to join' : joinLoading ? 'Joining...' : 'Join'}
            </Text>
          </Pressable>
        ) : null}
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
  infoCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 16,
    gap: 6,
  },
  mapCard: {
    height: 260,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  devModeCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f59e0b',
    backgroundColor: '#fffbeb',
    padding: 16,
    gap: 6,
  },
  devModeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400e',
    textTransform: 'uppercase',
  },
  infoCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  infoCardText: {
    color: '#475569',
    lineHeight: 20,
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
  infoHint: {
    color: '#475569',
    textAlign: 'center',
  },
  error: {
    color: '#b91c1c',
    fontWeight: '600',
    textAlign: 'center',
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
});
