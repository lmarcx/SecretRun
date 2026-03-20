import { StyleSheet, Text, View } from 'react-native';
import { borderWidth, colors, radius, spacing, typography } from '@/theme/tokens';

interface EmptyStateProps {
  title: string;
  description?: string;
}

export function EmptyState({ description, title }: EmptyStateProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    borderWidth: borderWidth.regular,
    borderColor: colors.border,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xxs,
  },
  title: {
    ...typography.body,
    color: colors.textMuted,
  },
  description: {
    ...typography.bodySm,
    color: colors.textMuted,
  },
});
