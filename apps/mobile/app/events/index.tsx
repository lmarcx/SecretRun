import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DEV_MODE_LABEL, getDevJoinLabel, getDevModeMessage, isDevRunnerActive } from '@/services/devRunnerMode';
import type { EventListItem } from '@/services/eventsService';
import { fetchPublicEvents, getEventErrorMessage } from '@/services/eventsService';
import { getStoredRunSession } from '@/services/runSessionStore';

interface EventSection {
  key: 'upcoming' | 'ready' | 'past';
  title: string;
  subtitle: string;
  items: EventListCardModel[];
}

interface EventListCardModel {
  event: EventListItem;
  statusLabels: string[];
  section: EventSection['key'];
  primaryLabel: string;
  primaryHref: `/events/${string}` | `/run/${string}`;
  primaryKind: 'primary' | 'secondary';
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

  const sections = useMemo(() => buildSections(events, devRunnerActive), [devRunnerActive, events]);

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
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.title}>Events</Text>
          <Text style={styles.subtitle}>Discover the next Secret Run, see what is ready right now, and keep finished sessions easy to revisit.</Text>
        </View>

        {devRunnerActive ? (
          <View style={styles.devModeCard}>
            <Text style={styles.devModeTitle}>{DEV_MODE_LABEL}</Text>
            <Text style={styles.devModeText}>{getDevModeMessage('events')}</Text>
          </View>
        ) : null}

        {sections.map((section) => (
          <View key={section.key} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionSubtitle}>{section.subtitle}</Text>
            </View>

            {section.items.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.info}>No events in this section yet.</Text>
              </View>
            ) : (
              section.items.map((item) => (
                <EventCard
                  key={item.event.id}
                  item={item}
                  onOpen={() => router.push(item.primaryHref)}
                  onOpenDetail={() => router.push(`/events/${item.event.id}`)}
                />
              ))
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function EventCard({
  item,
  onOpen,
  onOpenDetail,
}: {
  item: EventListCardModel;
  onOpen: () => void;
  onOpenDetail: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleBlock}>
          <Text style={styles.cardTitle}>{item.event.title}</Text>
          <Text style={styles.cardDescription}>{item.event.description || 'No description provided.'}</Text>
        </View>
        <View style={styles.badgeRow}>
          {item.statusLabels.map((label) => (
            <View key={label} style={[styles.badge, label === 'Ready to run' && styles.badgeActive, label === 'Finished' && styles.badgeFinished]}>
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
      </View>

      <View style={styles.metaGrid}>
        <Meta label="Reveal" value={formatDateTime(item.event.revealAt)} />
        <Meta label="Starts" value={formatDateTime(item.event.startsAt)} />
        <Meta label="Start zone" value={`${item.event.startAreaRadiusKm} km radius`} />
      </View>

      <View style={styles.cardActions}>
        <Pressable style={item.primaryKind === 'primary' ? styles.primaryAction : styles.secondaryAction} onPress={onOpen}>
          <Text style={item.primaryKind === 'primary' ? styles.primaryActionText : styles.secondaryActionText}>{item.primaryLabel}</Text>
        </Pressable>
        <Pressable style={styles.ghostAction} onPress={onOpenDetail}>
          <Text style={styles.ghostActionText}>Details</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaBlock}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function buildSections(events: EventListItem[], devRunnerActive: boolean): EventSection[] {
  const mapped = events.map((event) => buildEventCardModel(event, devRunnerActive));

  return [
    {
      key: 'ready',
      title: 'Ready to run',
      subtitle: 'Joined runs you can start right now.',
      items: mapped.filter((item) => item.section === 'ready'),
    },
    {
      key: 'upcoming',
      title: 'Upcoming',
      subtitle: 'Events to join or keep an eye on before reveal and start.',
      items: mapped.filter((item) => item.section === 'upcoming'),
    },
    {
      key: 'past',
      title: 'Past',
      subtitle: 'Finished events and completed local sessions.',
      items: mapped.filter((item) => item.section === 'past'),
    },
  ];
}

function buildEventCardModel(event: EventListItem, devRunnerActive: boolean): EventListCardModel {
  const now = Date.now();
  const revealed = new Date(event.revealAt).getTime() <= now;
  const started = new Date(event.startsAt).getTime() <= now;
  const past = new Date(event.endsAt ?? event.startsAt).getTime() <= now;
  const joined = event.viewerParticipationStatus === 'registered';
  const storedRunSession = getStoredRunSession(event.id);
  const finished = storedRunSession?.phase === 'completed';
  const readyToRun = joined && !finished && (devRunnerActive || (revealed && started && !past));

  const statusLabels = [
    finished ? 'Finished' : readyToRun ? 'Ready to run' : joined ? 'Joined' : 'Not joined',
    ...(revealed && !finished ? ['Revealed'] : []),
  ];

  let section: EventSection['key'] = 'upcoming';
  if (readyToRun) {
    section = 'ready';
  } else if (finished || past) {
    section = 'past';
  }

  let primaryLabel = 'Open event';
  let primaryHref: EventListCardModel['primaryHref'] = `/events/${event.id}`;
  let primaryKind: EventListCardModel['primaryKind'] = 'secondary';

  if (finished) {
    primaryLabel = 'View result';
    primaryHref = `/run/${event.id}`;
    primaryKind = 'primary';
  } else if (readyToRun) {
    primaryLabel = 'Start run';
    primaryHref = `/run/${event.id}`;
    primaryKind = 'primary';
  } else if (!joined) {
    primaryLabel = devRunnerActive ? getDevJoinLabel() : 'Join event';
    primaryKind = 'secondary';
  } else {
    primaryLabel = 'Already joined';
    primaryKind = 'secondary';
  }

  return {
    event,
    statusLabels,
    section,
    primaryLabel,
    primaryHref,
    primaryKind,
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
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
    gap: 18,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f8fafc',
    gap: 10,
  },
  hero: {
    gap: 6,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 16,
    color: '#475569',
    lineHeight: 22,
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    gap: 4,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  sectionSubtitle: {
    color: '#64748b',
    lineHeight: 20,
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
  devModeText: {
    color: '#92400e',
    lineHeight: 20,
  },
  card: {
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    gap: 14,
  },
  cardHeader: {
    gap: 10,
  },
  cardTitleBlock: {
    gap: 6,
  },
  cardTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: '#0f172a',
  },
  cardDescription: {
    color: '#334155',
    lineHeight: 21,
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
  metaGrid: {
    gap: 10,
  },
  metaBlock: {
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
  cardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryAction: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryActionText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryAction: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  secondaryActionText: {
    color: '#3730a3',
    fontSize: 15,
    fontWeight: '700',
  },
  ghostAction: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  ghostActionText: {
    color: '#334155',
    fontSize: 15,
    fontWeight: '700',
  },
  emptyCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 16,
  },
});
