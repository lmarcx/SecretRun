import { StyleSheet, Text, View } from 'react-native';
import { borderWidth, colors, radius, spacing, typography } from '@/theme/tokens';

interface StatCardProps {
  label: string;
  value: string;
  helper?: string;
}

export function StatCard({ helper, label, value }: StatCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={styles.value}>
        {value}
      </Text>
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: borderWidth.regular,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.xs,
  },
  label: {
    ...typography.eyebrow,
    color: colors.textMuted,
  },
  value: {
    fontSize: 23,
    lineHeight: 28,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  helper: {
    ...typography.bodySm,
    color: colors.textMuted,
  },
});
