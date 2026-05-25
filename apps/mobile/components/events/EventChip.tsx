import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { EventStatus, RunEvent } from '@/types/event';
import { fonts } from '@/theme/tokens';

const STATUS_CHIP_BG: Record<EventStatus, string> = {
  hidden: 'rgba(130,80,255,0.35)',
  full: 'rgba(232,184,75,0.35)',
  open: 'rgba(78,204,163,0.30)',
};

const STATUS_TEXT: Record<EventStatus, string> = {
  hidden: '#C4A3FF',
  full: '#F0C84E',
  open: '#5DDDB8',
};

const STATUS_LABELS: Record<EventStatus, string> = {
  hidden: 'Hidden',
  full: 'Full',
  open: 'Open',
};

interface EventChipProps {
  event: RunEvent;
  selected?: boolean | undefined;
  onPress?: (() => void) | undefined;
}

export function EventChip({ event, selected = false, onPress }: EventChipProps) {
  const chipBg = STATUS_CHIP_BG[event.status];
  const textColor = STATUS_TEXT[event.status];
  const isHidden = event.status === 'hidden';

  const metaTime = isHidden
    ? event.revealDate
      ? `Reveal ${formatTime(event.revealDate)}`
      : 'Route hidden'
    : `Start ${formatTime(event.startDate)}`;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && { borderColor: textColor, backgroundColor: 'rgba(20,16,36,0.96)' }]}
    >
      <View style={[styles.statusPill, { backgroundColor: chipBg }]}>
        <Text style={[styles.statusText, { color: textColor }]}>{STATUS_LABELS[event.status]}</Text>
      </View>

      {isHidden ? (
        <Text style={styles.hiddenTitle}>??? ???</Text>
      ) : (
        <Text numberOfLines={2} style={styles.title}>
          {event.title}
        </Text>
      )}

      <View style={styles.metaRow}>
        <Ionicons name="time-outline" size={11} color="rgba(255,255,255,0.35)" />
        <Text style={styles.metaText}>{metaTime}</Text>
      </View>

      {event.distanceKm != null && (
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={11} color="rgba(255,255,255,0.35)" />
          <Text style={styles.metaText}>
            {event.distanceKm < 1
              ? `${Math.round(event.distanceKm * 1000)} m`
              : `${event.distanceKm.toFixed(1)} km`}
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
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 14,
    gap: 8,
    marginRight: 12,
  },
  statusPill: {
    alignSelf: 'flex-start',
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
