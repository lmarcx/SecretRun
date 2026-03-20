import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/theme/tokens';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  accessory?: ReactNode;
}

export function ScreenHeader({ accessory, eyebrow, subtitle, title }: ScreenHeaderProps) {
  return (
    <View style={styles.container}>
      {(eyebrow || accessory) ? (
        <View style={styles.topRow}>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : <View />}
          {accessory}
        </View>
      ) : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  topRow: {
    minHeight: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  eyebrow: {
    ...typography.eyebrow,
    color: colors.textMuted,
    opacity: 0.82,
  },
  title: {
    ...typography.heroTitle,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.bodySm,
    color: colors.textMuted,
  },
});
