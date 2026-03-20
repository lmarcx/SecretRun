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
}

export function EventMetaRow({ dense = false, items }: EventMetaRowProps) {
  return (
    <View style={[styles.row, dense && styles.rowDense]}>
      {items.map((item) => (
        <View key={`${item.label}-${item.value}`} style={[styles.item, dense && styles.itemDense]}>
          <View style={[styles.iconWrap, dense && styles.iconWrapDense]}>
            <MetaGlyph icon={item.icon} />
          </View>
          <View style={styles.copy}>
            <Text numberOfLines={1} style={[styles.value, dense && styles.valueDense]}>
              {item.value}
            </Text>
            <Text style={styles.label}>{item.label}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function MetaGlyph({ icon }: { icon: EventMetaIcon }) {
  if (icon === 'zone') {
    return (
      <View style={styles.zoneOuter}>
        <View style={styles.zoneMid}>
          <View style={styles.zoneCore} />
        </View>
      </View>
    );
  }

  if (icon === 'start') {
    return (
      <View style={styles.startTrack}>
        <View style={styles.startTail} />
        <View style={styles.startCore} />
      </View>
    );
  }

  return (
    <View style={styles.revealTrack}>
      <View style={styles.revealRing} />
      <View style={styles.revealPulse} />
      <View style={styles.revealCore} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  rowDense: {
    gap: spacing.sm,
  },
  item: {
    flexGrow: 1,
    minWidth: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  itemDense: {
    minWidth: 82,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    borderWidth: borderWidth.regular,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapDense: {
    width: 24,
    height: 24,
  },
  copy: {
    gap: 1,
  },
  value: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  valueDense: {
    fontSize: 12,
    lineHeight: 16,
  },
  label: {
    ...typography.eyebrow,
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.8,
  },
  revealTrack: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  revealRing: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 12,
    borderWidth: borderWidth.regular,
    borderColor: 'rgba(138, 165, 255, 0.5)',
  },
  revealPulse: {
    position: 'absolute',
    width: 16,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(138, 165, 255, 0.14)',
    transform: [{ rotate: '-28deg' }],
  },
  revealCore: {
    width: 4,
    height: 4,
    borderRadius: 4,
    backgroundColor: colors.info,
  },
  startTrack: {
    width: 14,
    height: 14,
    justifyContent: 'center',
  },
  startTail: {
    width: 9,
    height: 2,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(120, 86, 255, 0.38)',
  },
  startCore: {
    position: 'absolute',
    right: 0,
    width: 6,
    height: 6,
    borderRadius: 6,
    backgroundColor: colors.accent,
  },
  zoneOuter: {
    width: 13,
    height: 13,
    borderRadius: 13,
    borderWidth: borderWidth.regular,
    borderColor: 'rgba(83, 215, 166, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneMid: {
    width: 7,
    height: 7,
    borderRadius: 7,
    borderWidth: borderWidth.regular,
    borderColor: 'rgba(83, 215, 166, 0.38)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneCore: {
    width: 3,
    height: 3,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
});
