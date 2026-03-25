import type { PressableProps } from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { borderWidth, colors, radius, spacing, typography } from '@/theme/tokens';

type ActionRowTone = 'default' | 'muted' | 'danger';

interface ActionRowProps extends Pick<PressableProps, 'disabled' | 'onPress'> {
  title: string;
  subtitle?: string | undefined;
  value?: string | undefined;
  tone?: ActionRowTone;
}

export function ActionRow({ disabled = false, onPress, subtitle, title, tone = 'default', value }: ActionRowProps) {
  const interactive = Boolean(onPress) && !disabled;

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!interactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        toneStyles[tone],
        interactive && pressed && styles.rowPressed,
        disabled && styles.rowDisabled,
      ]}
    >
      <View style={styles.copy}>
        <Text style={[styles.title, tone === 'danger' && styles.titleDanger]}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      {value ? (
        <View style={styles.valueWrap}>
          <Text numberOfLines={2} style={[styles.value, tone === 'danger' && styles.valueDanger]}>
            {value}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderRadius: radius.md,
    borderWidth: borderWidth.regular,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowPressed: {
    opacity: 0.9,
  },
  rowDisabled: {
    opacity: 0.6,
  },
  copy: {
    flex: 1,
    gap: spacing.xxs,
  },
  title: {
    ...typography.body,
    color: colors.textPrimary,
  },
  titleDanger: {
    color: colors.danger,
  },
  subtitle: {
    ...typography.bodySm,
    color: colors.textMuted,
  },
  valueWrap: {
    maxWidth: '42%',
    alignItems: 'flex-end',
  },
  value: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  valueDanger: {
    color: colors.danger,
  },
});

const toneStyles = StyleSheet.create({
  default: {
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  muted: {
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  danger: {
    borderColor: 'rgba(255, 124, 147, 0.2)',
    backgroundColor: 'rgba(255, 124, 147, 0.08)',
  },
});
