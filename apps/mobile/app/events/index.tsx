import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '@/components/ui/AppScreen';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';
import { EventCard } from '@/components/ui/EventCard';
import { EventHeroCard } from '@/components/ui/EventHeroCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SectionHeader } from '@/components/ui/SectionHeader';
import type { StatusBadgeTone } from '@/components/ui/StatusBadge';
import { useAuth } from '@/hooks/useAuth';
import { isDevRunnerActive } from '@/services/devRunnerMode';
import { debugEvents } from '@/services/eventsDebug';
import type { EventListItem } from '@/services/eventsService';
import { fetchPublicEvents, getEventsListErrorMessage } from '@/services/eventsService';
import { getStoredRunSession } from '@/services/runSessionStore';
import { colors, spacing, typography } from '@/theme/tokens';

interface EventPresentationModel {
  event: EventListItem;
  section: 'ready' | 'coming' | 'completed';
  eyebrow: string;
  description: string;
  statusBadge: { label: string; tone: StatusBadgeTone };
  statusItems: Array<{ label: string; tone: StatusBadgeTone }>;
  meta: Array<{ label: string; value: string; icon: 'reveal' | 'start' | 'zone' }>;
  primaryActionLabel: string;
  primaryHref: `/events/${string}` | `/run/${string}`;
  primaryTone: 'primary' | 'secondary';
}

interface EventSectionModel {
  key: 'ready' | 'coming' | 'completed';
  title: string;
  subtitle?: string;
  emptyTitle: string;
  emptyDescription: string;
  items: EventPresentationModel[];
}

export default function EventsScreen() {
  const router = useRouter();
  const { isAuthenticated, isAvailable: isAuthAvailable } = useAuth();
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const devRunnerActive = isDevRunnerActive();

  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, []);

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

        setError(getEventsListErrorMessage(err));
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

  const eventModels = useMemo(
    () =>
      events.map((event) =>
        buildEventPresentation(event, {
          devRunnerActive,
          isAuthenticated,
          isAuthAvailable,
          nowMs,
        }),
      ),
    [devRunnerActive, events, isAuthAvailable, isAuthenticated, nowMs],
  );
  const heroEvent = useMemo(() => selectHeroEvent(eventModels), [eventModels]);
  const sections = useMemo(
    () => buildSections(eventModels, heroEvent?.event.id ?? null),
    [eventModels, heroEvent?.event.id],
  );

  useEffect(() => {
    debugEvents('screen.sections', {
      rawEventCount: events.length,
      eventModelCount: eventModels.length,
      heroEventId: heroEvent?.event.id ?? null,
      sections: sections.map((section) => ({
        key: section.key,
        count: section.items.length,
        eventIds: section.items.map((item) => item.event.id),
      })),
    });
  }, [eventModels, events.length, heroEvent?.event.id, sections]);

  if (loading) {
    return (
      <AppScreen scrollable={false} contentContainerStyle={styles.centered}>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={styles.stateText}>Loading the next run window...</Text>
      </AppScreen>
    );
  }

  if (error) {
    return (
      <AppScreen scrollable={false} contentContainerStyle={styles.centered}>
        <Text style={styles.stateTitle}>Events</Text>
        <Text style={styles.errorText}>{error}</Text>
        <PrimaryButton label="Retry" onPress={() => setReloadKey((value) => value + 1)} style={styles.stateButton} />
      </AppScreen>
    );
  }

  if (eventModels.length === 0) {
    return (
      <AppScreen contentContainerStyle={styles.content}>
        <View style={styles.intro}>
          <View style={styles.systemRow}>
            <Text style={styles.systemText}>Night</Text>
          </View>
          <Text style={styles.screenTitle}>Tonight</Text>
          <Text style={styles.screenSubtitle}>Hidden starts. Clear timing.</Text>
        </View>
        <EmptyStateCard minimal title="Nothing live yet" />
        <PrimaryButton label="Refresh" onPress={() => setReloadKey((value) => value + 1)} />
      </AppScreen>
    );
  }

  return (
    <AppScreen contentContainerStyle={styles.content}>
      <View style={styles.intro}>
        <View style={styles.systemRow}>
          <Text style={styles.systemText}>Night</Text>
          {devRunnerActive ? <Text style={styles.systemDivider}>/</Text> : null}
          {devRunnerActive ? <Text style={styles.systemText}>Dev local</Text> : null}
        </View>
        <Text style={styles.screenTitle}>Tonight</Text>
        <Text style={styles.screenSubtitle}>Hidden starts. Clear timing.</Text>
      </View>

      {heroEvent ? (
        <EventHeroCard
          eyebrow={heroEvent.eyebrow}
          title={heroEvent.event.title}
          description={heroEvent.description}
          metaItems={heroEvent.meta}
          statusBadge={heroEvent.statusBadge}
          primaryAction={{ label: heroEvent.primaryActionLabel, onPress: () => router.push(heroEvent.primaryHref) }}
          {...(heroEvent.primaryHref === `/events/${heroEvent.event.id}`
            ? {}
            : { secondaryAction: { label: 'Brief', onPress: () => router.push(`/events/${heroEvent.event.id}`) } })}
        />
      ) : null}

      {sections.map((section) => (
        <View key={section.key} style={styles.section}>
          <SectionHeader {...(section.subtitle ? { subtitle: section.subtitle } : {})} title={section.title} />

          {section.items.length === 0 ? (
            <EmptyStateCard minimal title={section.emptyTitle} description={section.emptyDescription} />
          ) : (
            section.items.map((item) => (
              <EventCard
                key={item.event.id}
                eyebrow={item.eyebrow}
                title={item.event.title}
                description={item.description}
                statusBadge={item.statusBadge}
                statusItems={item.statusItems}
                meta={item.meta}
                primaryAction={{
                  label: item.primaryActionLabel,
                  onPress: () => router.push(item.primaryHref),
                  tone: item.primaryTone,
                }}
              />
            ))
          )}
        </View>
      ))}
    </AppScreen>
  );
}

function buildSections(eventModels: EventPresentationModel[], heroEventId: string | null): EventSectionModel[] {
  const visibleItems = eventModels.filter((item) => item.event.id !== heroEventId);
  const completedItems = visibleItems.filter((item) => item.section === 'completed');

  const sections: EventSectionModel[] = [
    {
      key: 'ready',
      title: 'Ready now',
      subtitle: 'Registered runners with a live start window',
      emptyTitle: 'Nothing ready yet',
      emptyDescription: '',
      items: visibleItems.filter((item) => item.section === 'ready'),
    },
    {
      key: 'coming',
      title: 'Coming up',
      subtitle: 'Upcoming reveals and start windows',
      emptyTitle: 'Nothing queued',
      emptyDescription: '',
      items: visibleItems.filter((item) => item.section === 'coming'),
    },
  ];

  if (completedItems.length > 0) {
    sections.push({
      key: 'completed',
      title: 'Saved runs',
      subtitle: 'Completed on this device or closed already',
      emptyTitle: '',
      emptyDescription: '',
      items: completedItems,
    });
  }

  return sections;
}

function selectHeroEvent(eventModels: EventPresentationModel[]): EventPresentationModel | null {
  const priority = ['ready', 'coming', 'completed'] as const;

  for (const section of priority) {
    const match = eventModels.find((item) => item.section === section);
    if (match) {
      return match;
    }
  }

  return eventModels[0] ?? null;
}

function buildEventPresentation(
  event: EventListItem,
  {
    devRunnerActive,
    isAuthenticated,
    isAuthAvailable,
    nowMs,
  }: {
    devRunnerActive: boolean;
    isAuthenticated: boolean;
    isAuthAvailable: boolean;
    nowMs: number;
  },
): EventPresentationModel {
  const revealAt = new Date(event.revealAt).getTime();
  const startsAt = new Date(event.startsAt).getTime();
  const endsAt = new Date(event.endsAt ?? event.startsAt).getTime();
  const revealed = revealAt <= nowMs;
  const started = startsAt <= nowMs;
  const past = endsAt <= nowMs;
  const joined = event.viewerParticipationStatus === 'registered';
  const storedRunSession = getStoredRunSession(event.id);
  const finished = storedRunSession?.phase === 'completed';
  const readyNow = joined && !finished && (devRunnerActive || (revealed && started && !past));
  const guestViewer = !joined && !devRunnerActive && !isAuthenticated && isAuthAvailable;
  const authOffline = !joined && !devRunnerActive && !isAuthenticated && !isAuthAvailable;

  const section: EventPresentationModel['section'] = readyNow ? 'ready' : finished || past ? 'completed' : 'coming';
  const statusLabel = finished
    ? 'Run saved'
    : readyNow
      ? 'Start window open'
      : past
        ? 'Window closed'
        : revealed
          ? 'Reveal live'
          : 'Upcoming';
  const statusBadge = { label: statusLabel, tone: getBadgeTone(statusLabel) };
  const statusItems = buildCardStatusItems({
    authOffline,
    guestViewer,
    joined,
    past,
    readyNow,
    revealed,
  });
  const eyebrow = getEventEyebrow({
    nowMs,
    readyNow,
    section,
    startsAt,
  });
  const description = getSignalDescription(
    event.description,
    getFallbackDescription({
      authOffline,
      finished,
      guestViewer,
      joined,
      past,
      readyNow,
      revealed,
      started,
    }),
  );

  let primaryActionLabel = 'Brief';
  let primaryHref: EventPresentationModel['primaryHref'] = `/events/${event.id}`;
  let primaryTone: EventPresentationModel['primaryTone'] = 'secondary';

  if (finished) {
    primaryActionLabel = 'Result';
    primaryHref = `/run/${event.id}`;
    primaryTone = 'primary';
  } else if (readyNow) {
    primaryActionLabel = 'Start';
    primaryHref = `/run/${event.id}`;
    primaryTone = 'primary';
  }

  return {
    event,
    section,
    eyebrow,
    description,
    primaryActionLabel,
    primaryHref,
    primaryTone,
    statusBadge,
    statusItems,
    meta: [
      { label: 'Reveal', value: formatDateTime(event.revealAt, nowMs), icon: 'reveal' },
      { label: 'Start', value: formatDateTime(event.startsAt, nowMs), icon: 'start' },
      { label: 'Zone', value: `${event.startAreaRadiusKm} km`, icon: 'zone' },
    ],
  };
}

function getBadgeTone(label: string): StatusBadgeTone {
  switch (label) {
    case 'Start window open':
      return 'success';
    case 'Reveal live':
      return 'accent';
    case 'Upcoming':
      return 'neutral';
    case 'Run saved':
      return 'info';
    case 'Window closed':
      return 'warning';
    default:
      return 'neutral';
  }
}

function getSignalDescription(source: string | null, fallback: string): string {
  const normalized = source?.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return fallback;
  }

  const words = normalized.split(' ');
  if (words.length <= 12 && normalized.length <= 84) {
    return normalized;
  }

  return fallback;
}

function buildCardStatusItems({
  authOffline,
  guestViewer,
  joined,
  past,
  readyNow,
  revealed,
}: {
  authOffline: boolean;
  guestViewer: boolean;
  joined: boolean;
  past: boolean;
  readyNow: boolean;
  revealed: boolean;
}): Array<{ label: string; tone: StatusBadgeTone }> {
  const items: Array<{ label: string; tone: StatusBadgeTone }> = [];

  if (joined) {
    items.push({ label: 'Registered', tone: readyNow ? 'success' : 'accent' });
  } else if (guestViewer) {
    items.push({ label: 'Guest', tone: 'neutral' });
  } else if (authOffline) {
    items.push({ label: 'Auth offline', tone: 'neutral' });
  }

  if (!past && !readyNow) {
    items.push({ label: revealed ? 'Reveal live' : 'Route locked', tone: revealed ? 'accent' : 'warning' });
  }

  return items;
}

function getEventEyebrow({
  nowMs,
  readyNow,
  section,
  startsAt,
}: {
  nowMs: number;
  readyNow: boolean;
  section: EventPresentationModel['section'];
  startsAt: number;
}) {
  if (readyNow) {
    return 'Ready now';
  }

  if (section === 'completed') {
    return 'Saved';
  }

  if (isSameCalendarDay(startsAt, nowMs)) {
    return 'Tonight';
  }

  if (isTomorrow(startsAt, nowMs)) {
    return 'Tomorrow';
  }

  return new Date(startsAt).toLocaleString([], { weekday: 'short' });
}

function getFallbackDescription({
  authOffline,
  finished,
  guestViewer,
  joined,
  past,
  readyNow,
  revealed,
  started,
}: {
  authOffline: boolean;
  finished: boolean;
  guestViewer: boolean;
  joined: boolean;
  past: boolean;
  readyNow: boolean;
  revealed: boolean;
  started: boolean;
}): string {
  if (finished) {
    return 'Run saved on this device.';
  }

  if (readyNow) {
    return 'Route live. Start window open.';
  }

  if (past) {
    return 'Event window closed.';
  }

  if (joined) {
    return revealed ? 'Reveal live. Waiting for the start window.' : 'Registered. Route locked until reveal.';
  }

  if (guestViewer) {
    return revealed ? 'Reveal live. Sign in to join.' : 'Guest view. Sign in before reveal.';
  }

  if (authOffline) {
    return revealed ? 'Reveal live. Brief available in guest mode.' : 'Route locked. Brief available in guest mode.';
  }

  if (revealed) {
    return started ? 'Reveal live. Join to unlock run access.' : 'Reveal live. Join before the start window opens.';
  }

  return 'Join before reveal. Route stays locked.';
}

function formatDateTime(value: string, nowMs: number): string {
  const date = new Date(value);
  const time = date.toLocaleString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const valueMs = date.getTime();
  if (isSameCalendarDay(valueMs, nowMs)) {
    return `Today ${time}`;
  }

  if (isTomorrow(valueMs, nowMs)) {
    return `Tomorrow ${time}`;
  }

  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isSameCalendarDay(firstMs: number, secondMs: number): boolean {
  const first = new Date(firstMs);
  const second = new Date(secondMs);

  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function isTomorrow(valueMs: number, nowMs: number): boolean {
  const nextDay = new Date(nowMs);
  nextDay.setHours(0, 0, 0, 0);
  nextDay.setDate(nextDay.getDate() + 1);

  const dayAfter = new Date(nextDay);
  dayAfter.setDate(dayAfter.getDate() + 1);

  return valueMs >= nextDay.getTime() && valueMs < dayAfter.getTime();
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
  intro: {
    gap: spacing.xs,
  },
  systemRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xxs,
    alignItems: 'center',
  },
  systemText: {
    ...typography.eyebrow,
    color: colors.textMuted,
    opacity: 0.72,
  },
  systemDivider: {
    color: colors.textMuted,
    opacity: 0.48,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
  },
  screenTitle: {
    ...typography.heroTitle,
    color: colors.textPrimary,
  },
  screenSubtitle: {
    ...typography.bodySm,
    color: colors.textMuted,
  },
  section: {
    gap: spacing.sm,
  },
  stateTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
  },
  stateText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 260,
  },
  errorText: {
    ...typography.body,
    color: colors.danger,
    textAlign: 'center',
    maxWidth: 300,
  },
  stateButton: {
    minWidth: 160,
  },
});
