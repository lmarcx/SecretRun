import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { EventStatus, RunEvent } from '@/types/event';
import { fonts } from '@/theme/tokens';
import { PulseRing } from './PulseRing';

type StatusColor = { pin: string; border: string; text: string; pulse: string };

const STATUS_COLORS: Record<EventStatus, StatusColor> = {
  hidden: {
    pin: 'rgba(130,80,255,0.20)',
    border: 'rgba(130,80,255,0.50)',
    text: '#C4A3FF',
    pulse: 'rgba(130,80,255,0.30)',
  },
  full: {
    pin: 'rgba(232,184,75,0.18)',
    border: 'rgba(232,184,75,0.50)',
    text: '#F0C84E',
    pulse: 'rgba(232,184,75,0.30)',
  },
  open: {
    pin: 'rgba(78,204,163,0.15)',
    border: 'rgba(78,204,163,0.40)',
    text: '#5DDDB8',
    pulse: 'rgba(78,204,163,0.25)',
  },
  completed: {
    pin: 'rgba(96,165,250,0.15)',
    border: 'rgba(96,165,250,0.40)',
    text: '#93C5FD',
    pulse: 'rgba(96,165,250,0.22)',
  },
};

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const STATUS_ICONS: Record<string, IoniconName> = {
  hidden: 'lock-closed',
  full: 'ellipse',
  open: 'walk',
  completed: 'checkmark-done',
};

interface MapPinProps {
  event: RunEvent;
}

export function MapPin({ event }: MapPinProps) {
  const c = STATUS_COLORS[event.status];
  const icon = (STATUS_ICONS[event.status] ?? 'ellipse') as IoniconName;
  const showPulse = event.status === 'hidden' || event.status === 'open';

  return (
    <View style={styles.wrapper}>
      {showPulse && (
        <View style={styles.pulseAnchor}>
          <PulseRing color={c.pulse} size={44} />
        </View>
      )}
      <View style={[styles.bubble, { backgroundColor: c.pin, borderColor: c.border }]}>
        <Ionicons name={icon} size={13} color={c.text} />
        {event.status !== 'hidden' && (
          <Text numberOfLines={1} style={[styles.label, { color: c.text }]}>
            {event.title}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
  },
  pulseAnchor: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    maxWidth: 148,
  },
  label: {
    fontSize: 11,
    fontFamily: fonts.dmSans600,
    fontWeight: '600',
    letterSpacing: 0.1,
    flexShrink: 1,
  },
});
