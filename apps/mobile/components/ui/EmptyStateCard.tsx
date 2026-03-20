import { StyleSheet, Text, View } from 'react-native';
import { borderWidth, colors, radius, spacing, typography } from '@/theme/tokens';

interface EmptyStateCardProps {
  title: string;
  description?: string;
}

export function EmptyStateCard({ description, title }: EmptyStateCardProps) {
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
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
    gap: spacing.xs,
  },
  title: {
    ...typography.cardTitle,
    color: colors.textPrimary,
  },
  description: {
    ...typography.body,
    color: colors.textMuted,
  },
});
