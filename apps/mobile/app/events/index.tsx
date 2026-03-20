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
import { StatusBadge } from '@/components/ui/StatusBadge';
import { isDevRunnerActive } from '@/services/devRunnerMode';
import type { EventListItem } from '@/services/eventsService';
import { fetchPublicEvents, getEventErrorMessage } from '@/services/eventsService';
import { getStoredRunSession } from '@/services/runSessionStore';
import { colors, spacing, typography } from '@/theme/tokens';

interface EventPresentationModel {
  event: EventListItem;
  section: 'ready' | 'coming' | 'completed';
  eyebrow: string;
  description: string;
  statusBadge: { label: string; tone: StatusBadgeTone };
  meta: Array<{ label: string; value: string; icon: 'reveal' | 'start' | 'zone' }>;
  primaryActionLabel: string;
  primaryHref: `/events/${string}` | `/run/${string}`;
  primaryTone: 'primary' | 'secondary';
}

interface EventSectionModel {
  key: 'ready' | 'coming' | 'completed';
  title: string;
  subtitle: string;
  emptyTitle: string;
  emptyDescription: string;
  items: EventPresentationModel[];
}

export default function EventsScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const devRunnerActive = isDevRunnerActive();

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

  const eventModels = useMemo(() => events.map((event) => buildEventPresentation(event, devRunnerActive)), [devRunnerActive, events]);
  const heroEvent = useMemo(() => selectHeroEvent(eventModels), [eventModels]);
  const sections = useMemo(
    () => buildSections(eventModels, heroEvent?.event.id ?? null),
    [eventModels, heroEvent?.event.id],
  );

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
            <StatusBadge label="Night sessions" tone="accent" />
          </View>
          <Text style={styles.screenTitle}>Events</Text>
          <Text style={styles.screenSubtitle}>Hidden starts. Clear timing.</Text>
        </View>
        <EmptyStateCard
          title="No events live yet"
          description="No drop is live. Check back for the next reveal."
        />
        <PrimaryButton label="Refresh" onPress={() => setReloadKey((value) => value + 1)} />
      </AppScreen>
    );
  }

  return (
    <AppScreen contentContainerStyle={styles.content}>
      <View style={styles.intro}>
        <View style={styles.systemRow}>
          <StatusBadge label="Night sessions" tone="accent" />
          {devRunnerActive ? <StatusBadge label="DEV local joins" tone="warning" /> : null}
        </View>
        <Text style={styles.screenTitle}>Events</Text>
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
          secondaryAction={{ label: 'Brief', onPress: () => router.push(`/events/${heroEvent.event.id}`) }}
        />
      ) : null}

      {sections.map((section) => (
        <View key={section.key} style={styles.section}>
          <SectionHeader title={section.title} subtitle={section.subtitle} />

          {section.items.length === 0 ? (
            <EmptyStateCard title={section.emptyTitle} description={section.emptyDescription} />
          ) : (
            section.items.map((item) => (
              <EventCard
                key={item.event.id}
                title={item.event.title}
                description={item.description}
                statusBadge={item.statusBadge}
                meta={item.meta}
                primaryAction={{
                  label: item.primaryActionLabel,
                  onPress: () => router.push(item.primaryHref),
                  tone: item.primaryTone,
                }}
                secondaryAction={{ label: 'Details', onPress: () => router.push(`/events/${item.event.id}`) }}
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
      subtitle: '',
      emptyTitle: 'Nothing armed right now',
      emptyDescription: 'Your next open run will appear here.',
      items: visibleItems.filter((item) => item.section === 'ready'),
    },
    {
      key: 'coming',
      title: 'Coming up',
      subtitle: '',
      emptyTitle: 'No upcoming drops',
      emptyDescription: 'Nothing else is queued right now.',
      items: visibleItems.filter((item) => item.section === 'coming'),
    },
  ];

  if (completedItems.length > 0) {
    sections.push({
      key: 'completed',
      title: 'Completed',
      subtitle: '',
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

function buildEventPresentation(event: EventListItem, devRunnerActive: boolean): EventPresentationModel {
  const now = Date.now();
  const revealAt = new Date(event.revealAt).getTime();
  const startsAt = new Date(event.startsAt).getTime();
  const endsAt = new Date(event.endsAt ?? event.startsAt).getTime();
  const revealed = revealAt <= now;
  const started = startsAt <= now;
  const past = endsAt <= now;
  const joined = event.viewerParticipationStatus === 'registered';
  const storedRunSession = getStoredRunSession(event.id);
  const finished = storedRunSession?.phase === 'completed';
  const readyNow = joined && !finished && (devRunnerActive || (revealed && started && !past));

  const section: EventPresentationModel['section'] = readyNow ? 'ready' : finished || past ? 'completed' : 'coming';
  const statusLabel = finished ? 'Completed' : readyNow ? 'Ready now' : joined ? 'Joined' : revealed ? 'Open' : 'Route sealed';

  let eyebrow = 'Featured event';
  if (section === 'ready') {
    eyebrow = 'Primary run';
  } else if (section === 'completed') {
    eyebrow = 'Saved result';
  }

  const description = getCompactDescription(
    event.description,
    section === 'ready'
      ? 'Route open. Start when ready.'
      : section === 'completed'
        ? 'Finished event kept ready for review.'
        : 'Hidden route. Tight brief.',
  );

  let primaryActionLabel = 'Open event';
  let primaryHref: EventPresentationModel['primaryHref'] = `/events/${event.id}`;
  let primaryTone: EventPresentationModel['primaryTone'] = 'secondary';

  if (finished) {
    primaryActionLabel = 'View result';
    primaryHref = `/run/${event.id}`;
    primaryTone = 'primary';
  } else if (readyNow) {
    primaryActionLabel = 'Start run';
    primaryHref = `/run/${event.id}`;
    primaryTone = 'primary';
  } else if (joined) {
    primaryActionLabel = 'Track event';
  } else {
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
    statusBadge: { label: statusLabel, tone: getBadgeTone(statusLabel) },
    meta: [
      { label: 'Reveal', value: formatDateTime(event.revealAt), icon: 'reveal' },
      { label: 'Start', value: formatDateTime(event.startsAt), icon: 'start' },
      { label: 'Zone', value: `${event.startAreaRadiusKm} km`, icon: 'zone' },
    ],
  };
}

function getBadgeTone(label: string): StatusBadgeTone {
  switch (label) {
    case 'Ready now':
      return 'success';
    case 'Completed':
      return 'info';
    case 'Joined':
      return 'accent';
    case 'Route sealed':
      return 'warning';
    default:
      return 'neutral';
  }
}

function getCompactDescription(source: string | null, fallback: string): string {
  const normalized = source?.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return fallback;
  }

  if (normalized.length <= 88) {
    return normalized;
  }

  return `${normalized.slice(0, 85).trimEnd()}...`;
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
  intro: {
    gap: spacing.xs,
  },
  systemRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    alignItems: 'center',
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
