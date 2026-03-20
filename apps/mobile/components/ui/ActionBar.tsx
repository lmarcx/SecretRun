import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { spacing } from '@/theme/tokens';

interface ActionBarProps {
  primary?: ReactNode;
  secondary?: ReactNode;
}

export function ActionBar({ primary, secondary }: ActionBarProps) {
  return (
    <View style={styles.row}>
      {secondary ? <View style={primary ? styles.secondary : styles.single}>{secondary}</View> : null}
      {primary ? <View style={styles.primary}>{primary}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  primary: {
    flex: 1,
  },
  secondary: {
    minWidth: 104,
  },
  single: {
    flex: 1,
  },
});
