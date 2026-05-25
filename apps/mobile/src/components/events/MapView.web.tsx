import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '@/components/ui/AppScreen';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';
import { EventCard } from '@/components/ui/EventCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SectionHeader } from '@/components/ui/SectionHeader';
import type { EventListItem } from '@/services/eventsService';
import { colors, spacing, typography } from '@/theme/tokens';

interface EventsMapFallbackProps {
  events: EventListItem[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onSelectEvent?: (eventId: string) => void;
}

export default function EventsMapFallback({
  error,
  events,
  loading = false,
  onRetry,
  onSelectEvent,
}: EventsMapFallbackProps) {
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
        {onRetry ? <PrimaryButton label="Retry" onPress={onRetry} style={styles.stateButton} /> : null}
      </AppScreen>
    );
  }

  return (
    <AppScreen contentContainerStyle={styles.listContent}>
      <View style={styles.intro}>
        <Text style={styles.screenTitle}>Tonight</Text>
        <Text style={styles.screenSubtitle}>Hidden starts. Clear timing.</Text>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Coming up" subtitle="Upcoming reveals and start windows" />
        {events.length === 0 ? (
          <EmptyStateCard minimal title="Nothing live yet" />
        ) : (
          events.map((event) => (
            <EventCard
              key={event.id}
              eyebrow="Event"
              title={event.title}
              description={event.description ?? 'Route locked. Brief available in guest mode.'}
              statusBadge={{ label: getStatusLabel(event), tone: 'neutral' }}
              meta={[
                { label: 'Reveal', value: formatDateTime(event.revealAt), icon: 'reveal' },
                { label: 'Start', value: formatDateTime(event.startsAt), icon: 'start' },
                { label: 'Zone', value: `${event.startAreaRadiusKm} km`, icon: 'zone' },
              ]}
              {...(onSelectEvent
                ? {
                    primaryAction: {
                      label: 'Brief',
                      onPress: () => onSelectEvent(event.id),
                      tone: 'secondary' as const,
                    },
                  }
                : {})}
            />
          ))
        )}
      </View>
    </AppScreen>
  );
}

function getStatusLabel(event: EventListItem): string {
  return new Date(event.revealAt).getTime() <= Date.now() ? 'Reveal live' : 'Upcoming';
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
  listContent: {
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
    flex: 1,
    fontSize: 13,
    color: '#F87171',
    lineHeight: 18,
    textAlign: 'center',
  },
  stateButton: {
    minWidth: 160,
  },
});
