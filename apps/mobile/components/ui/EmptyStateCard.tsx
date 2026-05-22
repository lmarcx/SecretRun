import { StyleSheet, Text, View } from 'react-native';
import { borderWidth, colors, radius, spacing, typography } from '@/theme/tokens';

interface EmptyStateCardProps {
  title: string;
  description?: string;
  minimal?: boolean;
}

export function EmptyStateCard({ description, minimal = false, title }: EmptyStateCardProps) {
  return (
    <View style={[styles.card, minimal && styles.cardMinimal]}>
      <Text style={[styles.title, minimal && styles.titleMinimal]}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: borderWidth.regular,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardMinimal: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  title: {
    ...typography.cardTitle,
    color: colors.textPrimary,
  },
  titleMinimal: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500',
    color: colors.textMuted,
  },
  description: {
    ...typography.body,
    color: colors.textMuted,
  },
});
