import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { RouteMap } from '@/components/RouteMap';
import { ActionBar } from '@/components/ui/ActionBar';
import { AppScreen } from '@/components/ui/AppScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { EventMetaRow } from '@/components/ui/EventMetaRow';
import { InfoRow } from '@/components/ui/InfoRow';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { SectionCard } from '@/components/ui/SectionCard';
import { StatusBadge, type StatusBadgeTone } from '@/components/ui/StatusBadge';
import { StatusStrip } from '@/components/ui/StatusStrip';
import { useAuth } from '@/hooks/useAuth';
import { DEV_MODE_LABEL, getEffectiveRunner, isDevRunnerActive } from '@/services/devRunnerMode';
import { canFetchProtectedEventRoute, fetchEventRoute, getEventRouteErrorMessage } from '@/services/eventRoutes';
import type { EventDetail } from '@/services/eventsService';
import { fetchEventDetails, getEventErrorMessage, joinEvent } from '@/services/eventsService';
import { getStoredRunSession } from '@/services/runSessionStore';
import { colors, spacing, typography } from '@/theme/tokens';
import type { EventRoute } from '@/utils/route';

interface BriefingState {
  stateLabel: string;
  stateTone: StatusBadgeTone;
  routeLabel: string;
  routeTone: StatusBadgeTone;
  joined: boolean;
  canOpenRun: boolean;
  routeRevealed: boolean;
}

export default function EventDetailsScreen() {
  const { id, notice } = useLocalSearchParams<{ id: string; notice?: string }>();
  const router = useRouter();
  const { isAuthenticated, isAvailable } = useAuth();
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
    const canRequestBackendRoute = canFetchProtectedEventRoute(event.viewerParticipationStatus);

    if ((!joined || !routeRevealed) && !devRunnerActive) {
      setRoute(null);
      setRouteError(null);
      setRouteLoading(false);
      return () => {
        active = false;
      };
    }

    if (!canRequestBackendRoute) {
      setRoute(null);
      setRouteLoading(false);
      setRouteError(devRunnerActive ? 'Preview stays locked in DEV runner mode.' : null);
      return () => {
        active = false;
      };
    }

    const loadRoute = async () => {
      setRouteLoading(true);
      setRouteError(null);

      try {
        const nextRoute = await fetchEventRoute(eventId, {
          allowRequest: canRequestBackendRoute,
        });
        if (!active) {
          return;
        }

        if (!nextRoute) {
          setRoute(null);
          setRouteError('Route not published yet.');
        } else {
          setRoute(nextRoute);
        }
      } catch (err) {
        if (!active) {
          return;
        }

        setRoute(null);
        setRouteError(getEventRouteErrorMessage(err));
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

  const briefingState = useMemo(() => {
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
      joined,
      canOpenRun,
      routeRevealed,
      stateLabel: hasFinishedRun ? 'Completed' : canOpenRun ? 'Ready' : joined ? 'Joined' : 'Open',
      stateTone: hasFinishedRun ? 'info' : canOpenRun ? 'success' : joined ? 'accent' : 'neutral',
      routeLabel: routeRevealed ? 'Revealed' : 'Sealed',
      routeTone: routeRevealed ? 'accent' : 'warning',
    } satisfies BriefingState;
  }, [devRunnerActive, event, hasFinishedRun]);

  const primaryAction = useMemo(
    () =>
      getPrimaryAction({
        hasFinishedRun,
        joined: briefingState?.joined ?? false,
        canOpenRun: briefingState?.canOpenRun ?? false,
        devRunnerActive,
        isAuthenticated,
        isAuthAvailable: isAvailable,
        joinLoading,
    }),
    [briefingState?.canOpenRun, briefingState?.joined, devRunnerActive, hasFinishedRun, isAuthenticated, isAvailable, joinLoading],
  );

  const routePreviewState = useMemo(
    () =>
      getRoutePreviewState({
        devRunnerActive,
        joined: briefingState?.joined ?? false,
        routeError,
        routeLoading,
        routeRevealed: briefingState?.routeRevealed ?? false,
        routeVisible: Boolean(route),
      }),
    [briefingState?.joined, briefingState?.routeRevealed, devRunnerActive, route, routeError, routeLoading],
  );

  const handleJoin = async () => {
    if (!eventId) {
      return;
    }

    if (!isAuthenticated && !devRunnerActive) {
      router.push('/(auth)/login');
      return;
    }

    if (event?.viewerParticipationStatus) {
      setFeedback({ type: 'success', message: 'Already joined.' });
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
        message: result === 'already_joined' ? 'Already joined.' : 'Joined successfully.',
      });
    } catch (err) {
      setFeedback({ type: 'error', message: getEventErrorMessage(err) });
    } finally {
      setJoinLoading(false);
    }
  };

  const handlePrimaryAction = () => {
    if (!event) {
      return;
    }

    if (primaryAction.kind === 'view_result' || primaryAction.kind === 'start_run') {
      router.push(`/run/${event.id}`);
      return;
    }

    if (primaryAction.kind === 'login') {
      router.push({ pathname: '/(auth)/login', params: { redirectTo: `/events/${event.id}` } });
      return;
    }

    if (primaryAction.kind === 'join') {
      void handleJoin();
    }
  };

  if (loading) {
    return (
      <AppScreen scrollable={false} contentContainerStyle={styles.centered}>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={styles.stateText}>Loading event brief...</Text>
      </AppScreen>
    );
  }

  if (error || !event || !briefingState) {
    return (
      <AppScreen scrollable={false} contentContainerStyle={styles.centered}>
        <Text style={styles.stateTitle}>Event</Text>
        <Text style={styles.errorText}>{error ?? 'Event not found.'}</Text>
        <SecondaryButton label="Retry" onPress={() => setReloadKey((value) => value + 1)} style={styles.stateButton} />
      </AppScreen>
    );
  }

  return (
    <AppScreen contentContainerStyle={styles.content}>
      <ScreenHeader title="Briefing" />

      {devRunnerActive || noticeMessage ? (
        <StatusStrip
          compact
          muted
          items={[
            ...(devRunnerActive ? [{ label: DEV_MODE_LABEL, tone: 'warning' as const }] : []),
            ...(noticeMessage ? [{ label: 'Notice', tone: 'info' as const }] : []),
          ]}
        />
      ) : null}

      <SectionCard
        title={event.title}
        accessory={<StatusBadge label={briefingState.stateLabel} tone={briefingState.stateTone} />}
        tone="accent"
      >
        <EventMetaRow
          items={[
            { label: 'Rev', value: formatDateTime(event.revealAt), icon: 'reveal' },
            { label: 'Run', value: formatDateTime(event.startsAt), icon: 'start' },
            { label: 'Zone', value: `${event.startAreaRadiusKm} km`, icon: 'zone' },
          ]}
          withRail
        />
        <Text numberOfLines={1} style={styles.heroLine}>
          {getHeroSignal(briefingState)}
        </Text>
      </SectionCard>

      <SectionCard title="Entry">
        <InfoRow label="State" value={briefingState.joined ? 'Registered' : isAuthenticated || devRunnerActive ? 'Not joined' : 'Signed out'} />
        {event.viewerJoinedAt ? <InfoRow label="Joined" value={formatDateTime(event.viewerJoinedAt)} /> : null}
        {event.participantCount !== null ? <InfoRow label="Runners" value={String(event.participantCount)} /> : null}
        {devRunnerActive && effectiveRunner ? <InfoRow label="Runner" value={effectiveRunner.username} tone="muted" /> : null}
      </SectionCard>

      <SectionCard title="Route" accessory={<StatusBadge compact label={routePreviewState.label} tone={routePreviewState.tone} />}>
        {route && (briefingState.joined || devRunnerActive) ? (
          <View style={styles.mapCard}>
            <RouteMap
              routePolyline={route.polyline}
              startPoint={route.startPoint}
              endPoint={route.endPoint}
              startZoneCenter={event.startAreaCenter}
              startZoneRadiusKm={event.startAreaRadiusKm}
            />
          </View>
        ) : (
          <EmptyState title={routePreviewState.emptyTitle} />
        )}
      </SectionCard>

      {noticeMessage ? (
        <SectionCard tone="muted">
          <Text style={styles.noticeText}>{noticeMessage}</Text>
        </SectionCard>
      ) : null}

      {feedback ? (
        <SectionCard tone="muted">
          <Text style={feedback.type === 'success' ? styles.successText : styles.errorTextLeft}>{feedback.message}</Text>
        </SectionCard>
      ) : null}

      <ActionBar
        secondary={<SecondaryButton label="Refresh" onPress={() => setReloadKey((value) => value + 1)} />}
        primary={<PrimaryButton label={primaryAction.label} onPress={handlePrimaryAction} disabled={primaryAction.disabled} />}
      />
    </AppScreen>
  );
}

function getPrimaryAction({
  hasFinishedRun,
  joined,
  canOpenRun,
  devRunnerActive,
  isAuthenticated,
  isAuthAvailable,
  joinLoading,
}: {
  hasFinishedRun: boolean;
  joined: boolean;
  canOpenRun: boolean;
  devRunnerActive: boolean;
  isAuthenticated: boolean;
  isAuthAvailable: boolean;
  joinLoading: boolean;
}) {
  if (hasFinishedRun) {
    return {
      kind: 'view_result' as const,
      label: 'Result',
      disabled: false,
    };
  }

  if (canOpenRun) {
    return {
      kind: 'start_run' as const,
      label: 'Start',
      disabled: false,
    };
  }

  if (joined) {
    return {
      kind: 'joined' as const,
      label: 'Joined',
      disabled: true,
    };
  }

  if (!isAuthenticated && devRunnerActive) {
    return {
      kind: 'join' as const,
      label: joinLoading ? 'Joining...' : 'Join',
      disabled: joinLoading,
    };
  }

  if (!isAuthenticated && !isAuthAvailable) {
    return {
      kind: 'auth_unavailable' as const,
      label: 'Join',
      disabled: true,
    };
  }

  if (!isAuthenticated) {
    return {
      kind: 'login' as const,
      label: 'Sign in to join',
      disabled: false,
    };
  }

  return {
    kind: 'join' as const,
    label: joinLoading ? 'Joining...' : 'Join',
    disabled: joinLoading,
  };
}

function getHeroSignal(state: BriefingState): string {
  if (state.canOpenRun) {
    return 'Route live. Start window open.';
  }

  if (state.joined) {
    return state.routeRevealed ? 'Preview live. Start window pending.' : 'Joined. Route sealed until reveal.';
  }

  return state.routeRevealed ? 'Preview live. Join to run.' : 'Timed reveal. Tight start zone.';
}

function getRoutePreviewState({
  devRunnerActive,
  joined,
  routeError,
  routeLoading,
  routeRevealed,
  routeVisible,
}: {
  devRunnerActive: boolean;
  joined: boolean;
  routeError: string | null;
  routeLoading: boolean;
  routeRevealed: boolean;
  routeVisible: boolean;
}) {
  if (routeVisible) {
    return {
      label: 'Preview',
      tone: 'success' as const,
      emptyTitle: 'Preview live',
    };
  }

  if (routeLoading) {
    return {
      label: 'Loading',
      tone: 'warning' as const,
      emptyTitle: 'Loading preview',
    };
  }

  if (!routeRevealed) {
    return {
      label: 'Sealed',
      tone: 'warning' as const,
      emptyTitle: 'Route sealed',
    };
  }

  if (!joined && !devRunnerActive) {
    return {
      label: 'Locked',
      tone: 'neutral' as const,
      emptyTitle: 'Join to unlock route',
    };
  }

  return {
    label: 'Offline',
    tone: 'warning' as const,
    emptyTitle: routeError ?? 'Preview unavailable',
  };
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
  content: {
    gap: spacing.lg,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  stateTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
  },
  stateText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorText: {
    ...typography.body,
    color: colors.danger,
    textAlign: 'center',
    maxWidth: 300,
  },
  errorTextLeft: {
    ...typography.bodySm,
    color: colors.danger,
  },
  successText: {
    ...typography.bodySm,
    color: colors.success,
  },
  stateButton: {
    minWidth: 160,
  },
  heroLine: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  mapCard: {
    height: 260,
    overflow: 'hidden',
    borderRadius: 16,
  },
  noticeText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
});
