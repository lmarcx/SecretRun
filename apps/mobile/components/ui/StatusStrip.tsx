import { StyleSheet, View } from 'react-native';
import type { StatusBadgeTone } from './StatusBadge';
import { StatusBadge } from './StatusBadge';

interface StatusStripProps {
  items: Array<{ label: string; tone?: StatusBadgeTone }>;
  compact?: boolean;
  muted?: boolean;
}

export function StatusStrip({ compact = false, items, muted = false }: StatusStripProps) {
  return (
    <View style={styles.row}>
      {items.map((item) => (
        <StatusBadge
          key={`${item.label}-${item.tone ?? 'neutral'}`}
          compact={compact}
          label={item.label}
          muted={muted}
          tone={item.tone ?? 'neutral'}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
