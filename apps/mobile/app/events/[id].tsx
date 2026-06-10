import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteMap } from '@/components/RouteMap';
import { AppScreen } from '@/components/ui/AppScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import type { StatusBadgeTone } from '@/components/ui/StatusBadge';
import { useAuth } from '@/hooks/useAuth';
import { DEV_MODE_LABEL, getEffectiveRunner, isDevRunnerActive } from '@/services/devRunnerMode';
import { canFetchProtectedEventRoute, fetchEventRoute, getEventRouteErrorMessage } from '@/services/eventRoutes';
import type { EventDetail } from '@/services/eventsService';
import { fetchEventDetails, getEventErrorMessage, joinEvent } from '@/services/eventsService';
import { getStoredRunSession } from '@/services/runSessionStore';
import { colors, fonts, spacing, typography } from '@/theme/tokens';
import type { EventRoute } from '@/utils/route';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface BriefingState {
  stateLabel: string;
  stateTone: StatusBadgeTone;
  routeLabel: string;
  routeTone: StatusBadgeTone;
  joined: boolean;
  canOpenRun: boolean;
  routeRevealed: boolean;
  startWindowOpen: boolean;
  eventStarted: boolean;
  eventPast: boolean;
  completed: boolean;
}

type ArcadeRowTone = 'default' | 'purple' | 'green' | 'orange' | 'muted';

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
  const [nowMs, setNowMs] = useState(() => Date.now());
  const eventId = Array.isArray(id) ? id[0] : id;
  const devRunnerActive = isDevRunnerActive();
  const effectiveRunner = getEffectiveRunner();
  const storedRunSession = eventId ? getStoredRunSession(eventId) : null;
  const hasFinishedRun = storedRunSession?.phase === 'completed';
  const noticeMessage = Array.isArray(notice) ? notice[0] : notice;
  const routeRevealGate = event ? new Date(event.revealAt).getTime() <= nowMs : false;

  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

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

    const routeRevealed = routeRevealGate;
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
  }, [devRunnerActive, event, eventId, reloadKey, routeRevealGate]);

  const briefingState = useMemo(() => {
    if (!event) {
      return null;
    }

    const routeRevealed = new Date(event.revealAt).getTime() <= nowMs;
    const started = new Date(event.startsAt).getTime() <= nowMs;
    const past = new Date(event.endsAt ?? event.startsAt).getTime() <= nowMs;
    const joined = event.viewerParticipationStatus === 'registered';
    const startWindowOpen = Boolean(joined && !hasFinishedRun && (devRunnerActive || (routeRevealed && started && !past)));

    return {
      joined,
      canOpenRun: startWindowOpen,
      routeRevealed,
      startWindowOpen,
      eventStarted: started,
      eventPast: past,
      completed: hasFinishedRun,
      stateLabel: hasFinishedRun ? 'Run saved' : startWindowOpen ? 'Start window open' : joined ? 'Registered' : 'Open for join',
      stateTone: hasFinishedRun ? 'info' : startWindowOpen ? 'success' : joined ? 'accent' : 'neutral',
      routeLabel: routeRevealed ? 'Reveal live' : 'Route locked',
      routeTone: routeRevealed ? 'accent' : 'warning',
    } satisfies BriefingState;
  }, [devRunnerActive, event, hasFinishedRun, nowMs]);

  const revealCountdown = useMemo(() => getRevealCountdown(event, nowMs), [event, nowMs]);
  const briefingStatusItems = useMemo(() => buildBriefingStatusItems(briefingState), [briefingState]);

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

  const eventStats = useMemo(() => {
    if (!event || !briefingState) {
      return null;
    }

    return getEventArcadeStats(event, briefingState, nowMs);
  }, [briefingState, event, nowMs]);

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
    <AppScreen contentContainerStyle={styles.content} style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.replace('/events')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={15} color="rgba(255,255,255,0.64)" />
        </Pressable>
        <Text style={styles.headerTitle}>Event details</Text>
        <Text style={styles.headerSeason}>{getSeasonLabel(event.startsAt)}</Text>
      </View>

      <View style={styles.statusRow}>
        {[
          ...(devRunnerActive ? [{ label: DEV_MODE_LABEL, tone: 'warning' as const }] : []),
          ...(noticeMessage ? [{ label: 'Notice', tone: 'info' as const }] : []),
          ...briefingStatusItems,
        ].map((item) => (
          <ArcadePill key={`${item.label}-${item.tone}`} label={item.label} tone={item.tone} />
        ))}
      </View>

      {eventStats ? (
        <View style={styles.arcadeCard}>
          <View pointerEvents="none" style={styles.cardGlow} />
          <View pointerEvents="none" style={styles.cardGlowBottom} />
          <View style={styles.cardTopBar} />

          <View style={styles.cardHeader}>
            <View style={styles.rarityWrap}>
              {Array.from({ length: 5 }).map((_, index) => (
                <View
                  key={index}
                  style={[styles.rarityDot, index < eventStats.rarityLevel ? styles.rarityDotOn : styles.rarityDotDim]}
                />
              ))}
              <Text style={styles.rarityLabel}>{eventStats.rarityLabel}</Text>
            </View>
            <View style={styles.pointsBadge}>
              <Ionicons name="star" size={14} color="#F0C84E" />
              <Text style={styles.pointsText}>+{eventStats.points} pts</Text>
            </View>
          </View>

          <Text style={styles.cardName}>{splitTitle(event.title)}</Text>
          <View style={styles.cardTypeRow}>
            <View style={styles.cardTypeRule} />
            <Text style={styles.cardType}>{eventStats.eventType}</Text>
          </View>

          <View style={styles.statsRow}>
            <ArcadeStat label="Distance" value={eventStats.distanceLabel} sub={eventStats.distanceSub} locked={!briefingState.routeRevealed} />
            <ArcadeStat label="Zone" value={`${formatZoneRadius(event.startAreaRadiusKm)} km`} sub="Start radius" color="green" />
            <ArcadeStat label="Runners" value={String(eventStats.runnersLabel)} sub={eventStats.runnersSub} />
            <ArcadeStat label="Points" value={String(eventStats.points)} sub="On finish" color="amber" />
          </View>

          <View style={styles.cardSep} />

          <View style={styles.barsWrap}>
            <ProgressBar label="Spots filled" valueLabel={eventStats.spotsLabel} progress={eventStats.spotsProgress} tone="purple" />
            <ProgressBar label={eventStats.timeProgressLabel} valueLabel={`${eventStats.timeProgress}%`} progress={eventStats.timeProgress} tone="amber" />
          </View>
        </View>
      ) : null}

      <View style={styles.countdownWrap}>
        <View style={styles.countdownIcon}>
          <Ionicons name={briefingState.routeRevealed ? 'flash' : 'hourglass'} size={20} color="#B38BFF" />
        </View>
        <View style={styles.countdownInfo}>
          <Text style={styles.countdownLabel}>{briefingState.routeRevealed ? 'Route reveal' : 'Route reveals in'}</Text>
          <Text style={styles.countdownTime}>{revealCountdown.value}</Text>
          <Text style={styles.countdownSub}>{revealCountdown.subtitle}</Text>
        </View>
      </View>

      <InfoSection
        title="Event window"
        icon="time-outline"
        rows={[
          { label: 'Reveal', value: formatFullDateTime(event.revealAt) },
          { label: 'Start', value: formatFullDateTime(event.startsAt) },
          ...(event.endsAt ? [{ label: 'End', value: formatFullDateTime(event.endsAt) }] : []),
          { label: 'Start radius', value: `${formatZoneRadius(event.startAreaRadiusKm)} km`, tone: 'purple' },
          { label: 'Distance', value: briefingState.routeRevealed ? 'Route visible after join' : 'Hidden until reveal', tone: 'muted' },
        ]}
      />

      <InfoSection
        title="Entry"
        rows={[
          {
            label: 'State',
            value: briefingState.joined ? 'Registered' : isAuthenticated || devRunnerActive ? 'Not registered' : 'Signed out',
            tone: briefingState.joined ? 'green' : 'orange',
          },
          { label: 'Runners', value: getRunnersLabel(event) },
          { label: 'Spots left', value: getSpotsLeftLabel(event) },
          ...(event.viewerJoinedAt ? [{ label: 'Joined', value: formatDateTime(event.viewerJoinedAt) }] : []),
          ...(devRunnerActive && effectiveRunner ? [{ label: 'Runner', value: effectiveRunner.username, tone: 'muted' as const }] : []),
        ]}
      />

      <View style={styles.routeSection}>
        <View style={styles.sectionHeader}>
          <Ionicons name="map-outline" size={14} color="rgba(255,255,255,0.28)" />
          <Text style={styles.sectionHeaderLabel}>Route</Text>
          <ArcadePill compact label={routePreviewState.label} tone={routePreviewState.tone} />
        </View>
        <View style={styles.routeBody}>
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
            <EmptyState title={routePreviewState.emptyTitle} description={routePreviewState.emptyDescription} />
          )}
        </View>
      </View>

      {noticeMessage ? <MessageBlock tone="info" message={noticeMessage} /> : null}
      {feedback ? <MessageBlock tone={feedback.type} message={feedback.message} /> : null}

      <View style={styles.ctaWrap}>
        <PrimaryButton label={primaryAction.label} onPress={handlePrimaryAction} disabled={primaryAction.disabled} />
        <SecondaryButton label="Refresh briefing" onPress={() => setReloadKey((value) => value + 1)} />
      </View>
    </AppScreen>
  );
}

function ArcadePill({
  compact = false,
  label,
  tone,
}: {
  compact?: boolean;
  label: string;
  tone: StatusBadgeTone;
}) {
  const color = pillColors[tone] ?? pillColors.neutral;

  return (
    <View style={[styles.pill, compact && styles.pillCompact, { backgroundColor: color.bg, borderColor: color.border }]}>
      {!compact ? <View style={[styles.pillDot, { backgroundColor: color.text }]} /> : null}
      <Text style={[styles.pillText, compact && styles.pillTextCompact, { color: color.text }]}>{label}</Text>
    </View>
  );
}

function ArcadeStat({
  color = 'default',
  label,
  locked = false,
  sub,
  value,
}: {
  color?: 'default' | 'green' | 'amber';
  label: string;
  locked?: boolean;
  sub: string;
  value: string;
}) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statVal, locked && styles.statValLocked, color === 'green' && styles.statValGreen, color === 'amber' && styles.statValAmber]}>
        {value}
      </Text>
      <Text style={styles.statSub}>{sub}</Text>
    </View>
  );
}

function ProgressBar({
  label,
  progress,
  tone,
  valueLabel,
}: {
  label: string;
  progress: number;
  tone: 'purple' | 'amber';
  valueLabel: string;
}) {
  return (
    <View style={styles.barRow}>
      <View style={styles.barMeta}>
        <Text style={styles.barLabel}>{label}</Text>
        <Text style={[styles.barValue, tone === 'purple' ? styles.barValuePurple : styles.barValueAmber]}>{valueLabel}</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, tone === 'purple' ? styles.barFillPurple : styles.barFillAmber, { width: `${progress}%` }]} />
      </View>
    </View>
  );
}

function InfoSection({
  icon,
  rows,
  title,
}: {
  icon?: IoniconName;
  rows: Array<{ label: string; value: string; tone?: ArcadeRowTone }>;
  title: string;
}) {
  return (
    <View style={styles.infoSection}>
      <View style={styles.sectionHeader}>
        {icon ? <Ionicons name={icon} size={14} color="rgba(255,255,255,0.28)" /> : null}
        <Text style={styles.sectionHeaderLabel}>{title}</Text>
      </View>
      <View style={styles.infoRows}>
        {rows.map((row) => (
          <View key={`${row.label}-${row.value}`} style={styles.infoRow}>
            <Text style={styles.infoKey}>{row.label}</Text>
            <Text style={[styles.infoVal, row.tone === 'purple' && styles.infoValPurple, row.tone === 'green' && styles.infoValGreen, row.tone === 'orange' && styles.infoValOrange, row.tone === 'muted' && styles.infoValMuted]}>
              {row.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function MessageBlock({ message, tone }: { message: string; tone: 'success' | 'error' | 'info' }) {
  return (
    <View style={styles.messageBlock}>
      <Text style={[styles.messageText, tone === 'success' && styles.successText, tone === 'error' && styles.errorTextLeft]}>{message}</Text>
    </View>
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

function buildBriefingStatusItems(state: BriefingState | null) {
  if (!state) {
    return [];
  }

  return [
    { label: state.routeRevealed ? 'Reveal live' : 'Route locked', tone: state.routeRevealed ? ('accent' as const) : ('warning' as const) },
    {
      label: state.startWindowOpen ? 'Start window open' : state.eventPast ? 'Window closed' : state.eventStarted ? 'Start live' : 'Start pending',
      tone: state.startWindowOpen ? ('success' as const) : state.eventPast ? ('neutral' as const) : ('info' as const),
    },
    {
      label: state.joined ? 'Registered' : 'Not registered',
      tone: state.joined ? ('success' as const) : ('neutral' as const),
    },
  ];
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
      label: 'Route live',
      tone: 'success' as const,
      emptyTitle: 'Preview live',
      emptyDescription: 'Route preview unlocked. Review the line and start zone before you run.',
    };
  }

  if (routeLoading) {
    return {
      label: 'Loading',
      tone: 'warning' as const,
      emptyTitle: 'Loading route preview',
      emptyDescription: 'Fetching the latest route details for this event.',
    };
  }

  if (!routeRevealed) {
    return {
      label: 'Route locked',
      tone: 'warning' as const,
      emptyTitle: 'Route locked until reveal',
      emptyDescription: 'Stay on the briefing screen until the countdown hits zero.',
    };
  }

  if (!joined && !devRunnerActive) {
    return {
      label: 'Join required',
      tone: 'neutral' as const,
      emptyTitle: 'Join to unlock route',
      emptyDescription: 'Only registered runners can preview the route once reveal is live.',
    };
  }

  return {
    label: 'Preview unavailable',
    tone: 'warning' as const,
    emptyTitle: routeError ?? 'Preview unavailable',
    emptyDescription: devRunnerActive
      ? 'DEV runner keeps this event local-only until route data is available on the device.'
      : 'Route data is not published yet. Refresh the briefing in a moment.',
  };
}

function getEventArcadeStats(event: EventDetail, state: BriefingState, nowMs: number) {
  const participantCount = event.participantCount ?? 0;
  const maxParticipants = event.maxParticipants ?? 0;
  const points = getPointsReward(event, state);
  const spotsProgress = maxParticipants > 0 ? clamp(Math.round((participantCount / maxParticipants) * 100), 0, 100) : 0;
  const revealAt = new Date(event.revealAt).getTime();
  const startsAt = new Date(event.startsAt).getTime();
  const endsAt = new Date(event.endsAt ?? event.startsAt).getTime();
  const timeProgress = getTimeProgress({ endsAt, nowMs, revealAt, startsAt, state });
  const filled = maxParticipants > 0 && participantCount >= maxParticipants;

  return {
    distanceLabel: state.routeRevealed ? 'Live' : '???',
    distanceSub: state.routeRevealed ? 'Route' : 'Hidden',
    eventType: `${getEventTypeLabel(state, filled)} - ${state.routeRevealed ? 'Route revealed' : 'Route hidden'}`,
    points,
    rarityLabel: points >= 70 ? 'Epic' : points >= 50 ? 'Rare' : 'Urban',
    rarityLevel: points >= 70 ? 5 : points >= 50 ? 4 : 3,
    runnersLabel: participantCount,
    runnersSub: maxParticipants > 0 ? 'Registered' : 'Runners',
    spotsLabel: maxParticipants > 0 ? `${participantCount} / ${maxParticipants}` : `${participantCount} reg.`,
    spotsProgress,
    timeProgress,
    timeProgressLabel: state.routeRevealed ? 'Window progress' : 'Time to reveal',
  };
}

function getEventTypeLabel(state: BriefingState, filled: boolean): string {
  if (state.completed) return 'Completed race';
  if (state.startWindowOpen) return 'Live run';
  if (filled) return 'Validated race';
  return 'Urban race';
}

function getPointsReward(event: EventDetail, state: BriefingState): number {
  const base = event.startAreaRadiusKm <= 0.5 ? 70 : event.startAreaRadiusKm <= 1 ? 55 : 40;
  if (state.startWindowOpen) return base + 10;
  if (state.completed) return Math.max(30, base - 10);
  return base;
}

function getTimeProgress({
  endsAt,
  nowMs,
  revealAt,
  startsAt,
  state,
}: {
  endsAt: number;
  nowMs: number;
  revealAt: number;
  startsAt: number;
  state: BriefingState;
}) {
  if (Number.isNaN(revealAt) || Number.isNaN(startsAt)) return 0;

  if (!state.routeRevealed) {
    const total = Math.max(1, startsAt - revealAt);
    const remaining = Math.max(0, revealAt - nowMs);
    return clamp(Math.round(100 - (remaining / total) * 100), 0, 100);
  }

  const total = Math.max(1, endsAt - startsAt);
  const elapsed = Math.max(0, nowMs - startsAt);
  return clamp(Math.round((elapsed / total) * 100), 0, 100);
}

function splitTitle(title: string): string {
  const words = title.trim().split(/\s+/);
  if (words.length <= 2) return title;
  const pivot = Math.ceil(words.length / 2);
  return `${words.slice(0, pivot).join(' ')}\n${words.slice(pivot).join(' ')}`;
}

function getSeasonLabel(value: string): string {
  const date = new Date(value);
  const month = date.getMonth();
  const season = month >= 2 && month <= 4 ? 'Spring' : month >= 5 && month <= 7 ? 'Summer' : month >= 8 && month <= 10 ? 'Autumn' : 'Winter';
  return `${season} ${date.getFullYear()}`;
}

function getRunnersLabel(event: EventDetail): string {
  const participantCount = event.participantCount ?? 0;
  return event.maxParticipants && event.maxParticipants > 0
    ? `${participantCount} / ${event.maxParticipants}`
    : String(participantCount);
}

function getSpotsLeftLabel(event: EventDetail): string {
  if (!event.maxParticipants || event.maxParticipants <= 0) return 'No cap';
  return String(Math.max(0, event.maxParticipants - (event.participantCount ?? 0)));
}

function getRevealCountdown(event: EventDetail | null, nowMs: number) {
  if (!event) {
    return {
      title: 'Reveal countdown',
      subtitle: 'Loading event timing',
      value: '--',
    };
  }

  const revealAtMs = new Date(event.revealAt).getTime();
  const diffMs = revealAtMs - nowMs;

  if (Number.isNaN(revealAtMs) || diffMs <= 0) {
    return {
      title: 'Reveal live',
      subtitle: `Unlocked ${formatFullDateTime(event.revealAt)}`,
      value: 'Live now',
    };
  }

  return {
    title: 'Reveal countdown',
    subtitle: `Unlocks ${formatFullDateTime(event.revealAt)}`,
    value: formatCountdown(diffMs),
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

function formatFullDateTime(value: string): string {
  return new Date(value).toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCountdown(diffMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  }

  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

function formatZoneRadius(value: number): string {
  const normalized = Number(value.toFixed(2));
  return String(normalized);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

const pillColors: Record<StatusBadgeTone, { bg: string; border: string; text: string }> = {
  neutral: {
    bg: 'rgba(255,255,255,0.06)',
    border: 'rgba(255,255,255,0.10)',
    text: 'rgba(255,255,255,0.42)',
  },
  accent: {
    bg: 'rgba(130,80,255,0.14)',
    border: 'rgba(130,80,255,0.30)',
    text: '#C4A3FF',
  },
  success: {
    bg: 'rgba(78,204,163,0.12)',
    border: 'rgba(78,204,163,0.28)',
    text: '#5DDDB8',
  },
  info: {
    bg: 'rgba(96,165,250,0.12)',
    border: 'rgba(96,165,250,0.28)',
    text: '#93C5FD',
  },
  warning: {
    bg: 'rgba(232,184,75,0.12)',
    border: 'rgba(232,184,75,0.30)',
    text: '#F0C84E',
  },
  danger: {
    bg: 'rgba(255,100,60,0.12)',
    border: 'rgba(255,100,60,0.28)',
    text: '#FF9870',
  },
};

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#0D0A1A',
  },
  content: {
    gap: 0,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: spacing.lg,
    backgroundColor: '#0D0A1A',
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
  header: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  backButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  headerTitle: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.dmSans600,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.45)',
  },
  headerSeason: {
    fontSize: 11,
    fontFamily: fonts.dmSans400,
    letterSpacing: 0.4,
    color: 'rgba(255,255,255,0.22)',
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  pillCompact: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pillDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  pillText: {
    fontSize: 10,
    fontFamily: fonts.dmSans600,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  pillTextCompact: {
    fontSize: 9,
    letterSpacing: 0.3,
  },
  arcadeCard: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 14,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(130,80,255,0.45)',
    backgroundColor: '#130D25',
  },
  cardGlow: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(130,80,255,0.12)',
  },
  cardGlowBottom: {
    position: 'absolute',
    bottom: -40,
    left: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(78,204,163,0.06)',
  },
  cardTopBar: {
    height: 2,
    backgroundColor: '#8250FF',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  rarityWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  rarityDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  rarityDotOn: {
    backgroundColor: '#8250FF',
  },
  rarityDotDim: {
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  rarityLabel: {
    marginLeft: 6,
    fontSize: 10,
    fontFamily: fonts.dmSans600,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: 'rgba(130,80,255,0.85)',
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(232,184,75,0.40)',
    backgroundColor: 'rgba(232,184,75,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  pointsText: {
    fontSize: 15,
    fontFamily: fonts.syne800,
    fontWeight: '800',
    color: '#F0C84E',
  },
  cardName: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 3,
    fontSize: 26,
    lineHeight: 28,
    fontFamily: fonts.syne800,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cardTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  cardTypeRule: {
    width: 12,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(130,80,255,0.45)',
  },
  cardType: {
    flex: 1,
    fontSize: 11,
    fontFamily: fonts.dmSans600,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.30)',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  statBox: {
    flex: 1,
    minHeight: 68,
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.045)',
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 3,
  },
  statLabel: {
    fontSize: 9,
    fontFamily: fonts.dmSans600,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.28)',
  },
  statVal: {
    fontSize: 16,
    lineHeight: 18,
    fontFamily: fonts.syne800,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statValLocked: {
    color: 'rgba(255,255,255,0.18)',
    letterSpacing: 1.4,
  },
  statValGreen: {
    color: '#4ECCA3',
  },
  statValAmber: {
    color: '#F0C84E',
  },
  statSub: {
    fontSize: 9,
    fontFamily: fonts.dmSans400,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.22)',
  },
  cardSep: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  barsWrap: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 10,
  },
  barRow: {
    gap: 5,
  },
  barMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  barLabel: {
    fontSize: 11,
    fontFamily: fonts.dmSans600,
    color: 'rgba(255,255,255,0.36)',
  },
  barValue: {
    fontSize: 11,
    fontFamily: fonts.dmSans600,
  },
  barValuePurple: {
    color: '#B38BFF',
  },
  barValueAmber: {
    color: '#F0C84E',
  },
  barTrack: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  barFillPurple: {
    backgroundColor: '#8250FF',
  },
  barFillAmber: {
    backgroundColor: '#E8B84B',
  },
  countdownWrap: {
    marginHorizontal: 16,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  countdownIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(130,80,255,0.30)',
    backgroundColor: 'rgba(130,80,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownInfo: {
    flex: 1,
  },
  countdownLabel: {
    marginBottom: 2,
    fontSize: 10,
    fontFamily: fonts.dmSans600,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.30)',
  },
  countdownTime: {
    fontSize: 26,
    lineHeight: 28,
    fontFamily: fonts.syne800,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  countdownSub: {
    marginTop: 2,
    fontSize: 10,
    fontFamily: fonts.dmSans400,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.22)',
  },
  infoSection: {
    marginHorizontal: 16,
    marginBottom: 14,
    overflow: 'hidden',
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.07)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  routeSection: {
    marginHorizontal: 16,
    marginBottom: 14,
    overflow: 'hidden',
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.07)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  sectionHeader: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  sectionHeaderLabel: {
    flex: 1,
    fontSize: 10,
    fontFamily: fonts.dmSans600,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.30)',
  },
  infoRows: {
    paddingVertical: 4,
  },
  infoRow: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  infoKey: {
    fontSize: 11,
    fontFamily: fonts.dmSans600,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.28)',
  },
  infoVal: {
    flex: 1,
    textAlign: 'right',
    fontSize: 12,
    fontFamily: fonts.dmSans600,
    color: 'rgba(255,255,255,0.70)',
  },
  infoValPurple: {
    color: '#C4A3FF',
  },
  infoValGreen: {
    color: '#4ECCA3',
  },
  infoValOrange: {
    color: '#FF9870',
  },
  infoValMuted: {
    color: 'rgba(255,255,255,0.25)',
    fontStyle: 'italic',
  },
  routeBody: {
    padding: 14,
  },
  mapCard: {
    height: 260,
    overflow: 'hidden',
    borderRadius: 12,
  },
  messageBlock: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  messageText: {
    ...typography.bodySm,
    color: colors.info,
  },
  ctaWrap: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 8,
  },
});
