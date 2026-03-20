import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/theme/tokens';

type InfoRowTone = 'default' | 'success' | 'warning' | 'danger' | 'muted';

interface InfoRowProps {
  label: string;
  value: string;
  tone?: InfoRowTone;
}

export function InfoRow({ label, tone = 'default', value }: InfoRowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text numberOfLines={2} style={[styles.value, valueToneStyles[tone]]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  label: {
    ...typography.eyebrow,
    color: colors.textMuted,
    flexShrink: 0,
  },
  value: {
    ...typography.bodySm,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
});

const valueToneStyles = StyleSheet.create({
  default: {
    color: colors.textPrimary,
  },
  success: {
    color: colors.success,
  },
  warning: {
    color: colors.warning,
  },
  danger: {
    color: colors.danger,
  },
  muted: {
    color: colors.textSecondary,
  },
});
