import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { EventStatus, RunEvent } from '@/types/event';
import { fonts } from '@/theme/tokens';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const STATUS_COLORS: Record<
  EventStatus,
  { chip: string; chipSelected: string; text: string; pill: string }
> = {
  hidden: {
    chip: 'rgba(130,80,255,0.22)',
    chipSelected: 'rgba(130,80,255,0.55)',
    text: '#C4A3FF',
    pill: 'rgba(130,80,255,0.35)',
  },
  full: {
    chip: 'rgba(232,184,75,0.22)',
    chipSelected: 'rgba(232,184,75,0.55)',
    text: '#F0C84E',
    pill: 'rgba(232,184,75,0.35)',
  },
  open: {
    chip: 'rgba(78,204,163,0.18)',
    chipSelected: 'rgba(78,204,163,0.45)',
    text: '#5DDDB8',
    pill: 'rgba(78,204,163,0.30)',
  },
  completed: {
    chip: 'rgba(96,165,250,0.18)',
    chipSelected: 'rgba(96,165,250,0.45)',
    text: '#93C5FD',
    pill: 'rgba(96,165,250,0.24)',
  },
};

const STATUS_LABELS: Record<EventStatus, string> = {
  hidden: 'Hidden',
  full: 'Validated',
  open: 'Live',
  completed: 'Done',
};

const STATUS_ICONS: Record<EventStatus, IoniconName> = {
  hidden: 'lock-closed-outline',
  full: 'people-outline',
  open: 'walk-outline',
  completed: 'checkmark-done-outline',
};

interface EventChipProps {
  event: RunEvent;
  selected?: boolean | undefined;
  onPress?: (() => void) | undefined;
}

export function EventChip({ event, selected = false, onPress }: EventChipProps) {
  const c = STATUS_COLORS[event.status];
  const isHidden = event.status === 'hidden';
  const isCompleted = event.status === 'completed';

  const metaTime = isHidden
    ? event.revealDate
      ? `Reveal ${formatTime(event.revealDate)}`
      : 'Route hidden'
    : isCompleted
      ? `Completed ${formatTime(event.startDate)}`
      : `Start ${formatTime(event.startDate)}`;

  const showParticipants =
    !isHidden && event.maxParticipants > 0;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        { borderColor: selected ? c.chipSelected : c.chip },
        selected && styles.chipSelected,
      ]}
    >
      {/* Status pill */}
      <View style={[styles.statusPill, { backgroundColor: c.pill }]}>
        <Ionicons name={STATUS_ICONS[event.status]} size={10} color={c.text} />
        <Text style={[styles.statusText, { color: c.text }]}>
          {STATUS_LABELS[event.status]}
        </Text>
      </View>

      {/* Title */}
      {isHidden ? (
        <View style={styles.hiddenTitleRow}>
          <Ionicons name="lock-closed" size={11} color="rgba(255,255,255,0.15)" />
          <Text style={styles.hiddenTitle}>??? ???</Text>
        </View>
      ) : (
        <Text numberOfLines={2} style={styles.title}>
          {event.title}
        </Text>
      )}

      {/* Meta */}
      <View style={styles.metaRow}>
        <Ionicons name="time-outline" size={11} color="rgba(255,255,255,0.35)" />
        <Text style={styles.metaText}>{metaTime}</Text>
      </View>

      {!isHidden && event.distanceKm != null && (
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={11} color="rgba(255,255,255,0.35)" />
          <Text style={styles.metaText}>
            {event.distanceKm < 1
              ? `${Math.round(event.distanceKm * 1000)} m`
              : `${event.distanceKm.toFixed(1)} km`}
          </Text>
        </View>
      )}

      {showParticipants && (
        <View style={styles.metaRow}>
          <Ionicons name="people-outline" size={11} color="rgba(255,255,255,0.35)" />
          <Text style={styles.metaText}>
            {event.registeredCount}/{event.maxParticipants}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString([], { hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  chip: {
    width: 220,
    backgroundColor: 'rgba(12,10,20,0.92)',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 8,
    marginRight: 12,
  },
  chipSelected: {
    backgroundColor: 'rgba(20,16,36,0.96)',
  },
  statusPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontFamily: fonts.dmSans600,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 14,
    fontFamily: fonts.dmSans600,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 19,
  },
  hiddenTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hiddenTitle: {
    fontSize: 14,
    fontFamily: fonts.dmSans600,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.15)',
    letterSpacing: 3,
    lineHeight: 19,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    fontFamily: fonts.dmSans400,
    color: 'rgba(255,255,255,0.40)',
    lineHeight: 15,
  },
});
