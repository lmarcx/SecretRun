import { StyleSheet, Text, View } from 'react-native';
import { borderWidth, colors, radius, spacing, typography } from '@/theme/tokens';

export type EventMetaIcon = 'reveal' | 'start' | 'zone';

interface EventMetaRowProps {
  items: Array<{
    label: string;
    value: string;
    icon: EventMetaIcon;
  }>;
  dense?: boolean;
  withRail?: boolean;
}

export function EventMetaRow({ dense = false, items, withRail = false }: EventMetaRowProps) {
  return (
    <View style={[styles.row, dense && styles.rowDense]}>
      {withRail ? <View pointerEvents="none" style={[styles.rail, dense && styles.railDense]} /> : null}
      {items.map((item) => (
        <View key={`${item.label}-${item.value}`} style={[styles.item, dense && styles.itemDense]}>
          <MetaGlyph compact={dense} icon={item.icon} />
          <Text accessibilityLabel={`${item.label} ${item.value}`} numberOfLines={1} style={[styles.value, dense && styles.valueDense]}>
            {item.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

function MetaGlyph({ compact = false, icon }: { icon: EventMetaIcon; compact?: boolean }) {
  if (icon === 'zone') {
    return (
      <View style={[styles.zoneOuter, compact && styles.zoneOuterCompact]}>
        <View style={[styles.zoneMid, compact && styles.zoneMidCompact]}>
          <View style={styles.zoneCore} />
        </View>
      </View>
    );
  }

  if (icon === 'start') {
    return (
      <View style={[styles.startTrack, compact && styles.startTrackCompact]}>
        <View style={[styles.startTail, compact && styles.startTailCompact]} />
        <View style={[styles.startCore, compact && styles.startCoreCompact]} />
      </View>
    );
  }

  return (
    <View style={[styles.revealTrack, compact && styles.revealTrackCompact]}>
      <View style={[styles.revealRing, compact && styles.revealRingCompact]} />
      <View style={[styles.revealPulse, compact && styles.revealPulseCompact]} />
      <View style={[styles.revealCore, compact && styles.revealCoreCompact]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    minHeight: 22,
  },
  rowDense: {
    gap: spacing.xs,
    minHeight: 18,
  },
  rail: {
    position: 'absolute',
    left: 2,
    right: 10,
    height: borderWidth.regular,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  railDense: {
    right: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 1,
  },
  itemDense: {
    gap: spacing.xxs + 1,
  },
  value: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  valueDense: {
    fontSize: 11,
    lineHeight: 14,
  },
  revealTrack: {
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  revealTrackCompact: {
    width: 10,
    height: 10,
  },
  revealRing: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 12,
    borderWidth: borderWidth.regular,
    borderColor: 'rgba(138, 165, 255, 0.38)',
  },
  revealRingCompact: {
    width: 8,
    height: 8,
  },
  revealPulse: {
    position: 'absolute',
    width: 14,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(138, 165, 255, 0.12)',
    transform: [{ rotate: '-28deg' }],
  },
  revealPulseCompact: {
    width: 10,
    height: 3,
  },
  revealCore: {
    width: 3,
    height: 3,
    borderRadius: 4,
    backgroundColor: colors.info,
  },
  revealCoreCompact: {
    width: 2,
    height: 2,
  },
  startTrack: {
    width: 12,
    height: 12,
    justifyContent: 'center',
  },
  startTrackCompact: {
    width: 10,
    height: 10,
  },
  startTail: {
    width: 8,
    height: 2,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(120, 86, 255, 0.34)',
  },
  startTailCompact: {
    width: 6,
  },
  startCore: {
    position: 'absolute',
    right: 0,
    width: 5,
    height: 5,
    borderRadius: 6,
    backgroundColor: colors.accent,
  },
  startCoreCompact: {
    width: 4,
    height: 4,
  },
  zoneOuter: {
    width: 11,
    height: 11,
    borderRadius: 13,
    borderWidth: borderWidth.regular,
    borderColor: 'rgba(83, 215, 166, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneOuterCompact: {
    width: 9,
    height: 9,
  },
  zoneMid: {
    width: 6,
    height: 6,
    borderRadius: 7,
    borderWidth: borderWidth.regular,
    borderColor: 'rgba(83, 215, 166, 0.32)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneMidCompact: {
    width: 4,
    height: 4,
  },
  zoneCore: {
    width: 2,
    height: 2,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
});
