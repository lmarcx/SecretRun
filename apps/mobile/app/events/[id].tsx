import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteMap } from '@/components/RouteMap';
import { useAuth } from '@/hooks/useAuth';
import { DEV_MODE_LABEL, getDevJoinLabel, getDevModeMessage, getEffectiveRunner, isDevRunnerActive } from '@/services/devRunnerMode';
import { fetchEventRoute } from '@/services/eventRoutes';
import type { EventDetail } from '@/services/eventsService';
import { fetchEventDetails, getEventErrorMessage, joinEvent } from '@/services/eventsService';
import { getStoredRunSession } from '@/services/runSessionStore';
import type { EventRoute } from '@/utils/route';

export default function EventDetailsScreen() {
  const { id, notice } = useLocalSearchParams<{ id: string; notice?: string }>();
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
  const devRunnerActive = isDevRunnerActive();
  const effectiveRunner = getEffectiveRunner();
  const storedRunSession = eventId ? getStoredRunSession(eventId) : null;
  const hasFinishedRun = storedRunSession?.phase === 'completed';
  const noticeMessage = Array.isArray(notice) ? notice[0] : notice;

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!eventId) {
        setError('Missing event id.');
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

    if (!event || !eventId) {
      setRoute(null);
      setRouteError(null);
      setRouteLoading(false);
      return () => {
        active = false;
      };
    }

    const routeRevealed = new Date(event.revealAt).getTime() <= Date.now();
    const joined = event.viewerParticipationStatus === 'registered';

    if ((!joined || !routeRevealed) && !devRunnerActive) {
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
  }, [devRunnerActive, event, eventId, reloadKey]);

  const eventState = useMemo(() => {
    if (!event) {
      return null;
    }

    const now = Date.now();
    const routeRevealed = new Date(event.revealAt).getTime() <= now;
    const started = new Date(event.startsAt).getTime() <= now;
    const past = new Date(event.endsAt ?? event.startsAt).getTime() <= now;
    const joined = event.viewerParticipationStatus === 'registered';
    const canOpenRun = Boolean(joined && !hasFinishedRun && (devRunnerActive || (routeRevealed && started && !past)));

    return {
      routeRevealed,
      started,
      past,
      joined,
      canOpenRun,
      statusLabels: [
        hasFinishedRun ? 'Finished' : canOpenRun ? 'Ready to run' : joined ? 'Joined' : 'Not joined',
        ...(routeRevealed ? ['Revealed'] : []),
      ],
    };
  }, [devRunnerActive, event, hasFinishedRun]);

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

  if (error || !event || !eventState) {
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

  const primaryAction = getPrimaryAction({
    hasFinishedRun,
    joined: eventState.joined,
    canOpenRun: eventState.canOpenRun,
    devRunnerActive,
    isAuthenticated,
    joinLoading,
  });

  const handlePrimaryAction = () => {
    if (primaryAction.kind === 'view_result' || primaryAction.kind === 'start_run') {
      router.push(`/run/${event.id}`);
      return;
    }

    if (primaryAction.kind === 'login') {
      router.push('/(auth)/login');
      return;
    }

    if (primaryAction.kind === 'join') {
      void handleJoin();
      return;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroCard}>
          <View style={styles.badgeRow}>
            {eventState.statusLabels.map((label) => (
              <View
                key={label}
                style={[styles.badge, label === 'Ready to run' && styles.badgeActive, label === 'Finished' && styles.badgeFinished]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    label === 'Ready to run' && styles.badgeActiveText,
                    label === 'Finished' && styles.badgeFinishedText,
                  ]}
                >
                  {label}
                </Text>
              </View>
            ))}
          </View>
          <Text style={styles.title}>{event.title}</Text>
          <Text style={styles.description}>{event.description || 'No description provided.'}</Text>
        </View>

        {devRunnerActive ? (
          <View style={styles.devModeCard}>
            <Text style={styles.devModeTitle}>{DEV_MODE_LABEL}</Text>
            <Text style={styles.infoCardText}>{getDevModeMessage('event_detail')}</Text>
            <Text style={styles.infoCardText}>Active runner: {effectiveRunner?.username ?? 'Dev Runner'}</Text>
          </View>
        ) : null}

        {noticeMessage ? (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeText}>{noticeMessage}</Text>
          </View>
        ) : null}

        <View style={styles.timelineCard}>
          <Text style={styles.cardTitle}>Event timing</Text>
          <MetaRow label="Reveal" value={formatDateTime(event.revealAt)} />
          <MetaRow label="Starts" value={formatDateTime(event.startsAt)} />
          {event.endsAt ? <MetaRow label="Ends" value={formatDateTime(event.endsAt)} /> : null}
          <MetaRow label="Start zone" value={`${event.startAreaRadiusKm} km radius`} />
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Participation</Text>
          <Text style={styles.infoCardText}>
            {eventState.joined
              ? hasFinishedRun
                ? 'Your local run result is saved on this device for this event.'
                : 'You are registered and ready for reveal/start timing updates.'
              : devRunnerActive
                ? 'Join locally in DEV mode to test the full flow without backend auth.'
                : 'Join this event to unlock the run flow once reveal and start timing allow it.'}
          </Text>
          <MetaRow
            label="Status"
            value={eventState.joined ? event.viewerParticipationStatus ?? 'Registered' : isAuthenticated || devRunnerActive ? 'Not joined' : 'Signed out'}
          />
          {event.viewerJoinedAt ? <MetaRow label="Joined at" value={formatDateTime(event.viewerJoinedAt)} /> : null}
          {event.participantCount !== null ? <MetaRow label="Participants" value={String(event.participantCount)} /> : null}
        </View>

        {!eventState.joined && !devRunnerActive ? (
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Route access</Text>
            <Text style={styles.infoCardText}>Join this event first. Revealed routes are visible only to participants.</Text>
          </View>
        ) : !eventState.routeRevealed && !devRunnerActive ? (
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Route locked</Text>
            <Text style={styles.infoCardText}>The route will be revealed after {formatDateTime(event.revealAt)}. Until then, only the start zone stays visible.</Text>
          </View>
        ) : routeLoading ? (
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Loading route</Text>
            <Text style={styles.infoCardText}>Fetching the revealed route now.</Text>
          </View>
        ) : routeError || !route ? (
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Route unavailable</Text>
            <Text style={styles.infoCardText}>{routeError ?? 'Route details are not available yet.'}</Text>
          </View>
        ) : (
          <View style={styles.mapSection}>
            <Text style={styles.cardTitle}>Route preview</Text>
            <Text style={styles.infoCardText}>Start and finish markers are shown once the route is available.</Text>
            <View style={styles.mapCard}>
              <RouteMap
                routePolyline={route.polyline}
                startPoint={route.startPoint}
                endPoint={route.endPoint}
                startZoneCenter={event.startAreaCenter}
                startZoneRadiusKm={event.startAreaRadiusKm}
              />
            </View>
          </View>
        )}

        <View style={styles.primaryActionBlock}>
          <Pressable
            style={[styles.primaryButton, primaryAction.disabled && styles.buttonDisabled]}
            onPress={handlePrimaryAction}
            disabled={primaryAction.disabled}
          >
            <Text style={styles.primaryButtonText}>{primaryAction.label}</Text>
          </Pressable>
          {primaryAction.hint ? <Text style={styles.infoHint}>{primaryAction.hint}</Text> : null}
        </View>

        {feedback ? (
          <View style={[styles.feedbackCard, feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError]}>
            <Text style={feedback.type === 'success' ? styles.success : styles.error}>{feedback.message}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function getPrimaryAction({
  hasFinishedRun,
  joined,
  canOpenRun,
  devRunnerActive,
  isAuthenticated,
  joinLoading,
}: {
  hasFinishedRun: boolean;
  joined: boolean;
  canOpenRun: boolean;
  devRunnerActive: boolean;
  isAuthenticated: boolean;
  joinLoading: boolean;
}) {
  if (hasFinishedRun) {
    return {
      kind: 'view_result' as const,
      label: 'View result',
      disabled: false,
      hint: 'Open the saved result screen and upload state for this event.',
    };
  }

  if (canOpenRun) {
    return {
      kind: 'start_run' as const,
      label: 'Start Run',
      disabled: false,
      hint: 'Open the run tracker for this event.',
    };
  }

  if (joined) {
    return {
      kind: 'joined' as const,
      label: 'Already joined',
      disabled: true,
      hint: 'This event is registered. Start Run unlocks after reveal and start timing, unless DEV mode bypass is active.',
    };
  }

  if (!isAuthenticated && devRunnerActive) {
    return {
      kind: 'join' as const,
      label: joinLoading ? 'Joining...' : getDevJoinLabel(),
      disabled: joinLoading,
      hint: 'This joins locally only and keeps the backend auth system untouched.',
    };
  }

  if (!isAuthenticated) {
    return {
      kind: 'login' as const,
      label: 'Sign in to join',
      disabled: false,
      hint: 'Local auth is still unavailable in this environment, so this opens the signed-out auth shell.',
    };
  }

  return {
    kind: 'join' as const,
    label: joinLoading ? 'Joining...' : 'Join',
    disabled: joinLoading,
    hint: 'Register now so the route reveal and run flow are ready when the event opens.',
  };
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    padding: 20,
    gap: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 10,
    backgroundColor: '#f8fafc',
  },
  heroCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 18,
    gap: 10,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#0f172a',
  },
  description: {
    color: '#334155',
    fontSize: 16,
    lineHeight: 22,
  },
  subtitle: {
    color: '#334155',
    textAlign: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeActive: {
    backgroundColor: '#dcfce7',
  },
  badgeFinished: {
    backgroundColor: '#dbeafe',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  badgeActiveText: {
    color: '#166534',
  },
  badgeFinishedText: {
    color: '#1d4ed8',
  },
  timelineCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 16,
    gap: 10,
  },
  infoCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 16,
    gap: 8,
  },
  noticeCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fdba74',
    backgroundColor: '#fff7ed',
    padding: 16,
  },
  noticeText: {
    color: '#9a3412',
    fontWeight: '600',
    lineHeight: 20,
  },
  mapSection: {
    gap: 8,
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
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  infoCardText: {
    color: '#475569',
    lineHeight: 20,
  },
  metaRow: {
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
  primaryActionBlock: {
    gap: 8,
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttonDisabled: {
    backgroundColor: '#94a3b8',
  },
  primaryButtonText: {
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
    lineHeight: 20,
  },
  error: {
    color: '#b91c1c',
    fontWeight: '600',
    textAlign: 'center',
  },
  feedbackCard: {
    borderRadius: 14,
    padding: 14,
  },
  feedbackSuccess: {
    backgroundColor: '#f0fdf4',
  },
  feedbackError: {
    backgroundColor: '#fef2f2',
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
