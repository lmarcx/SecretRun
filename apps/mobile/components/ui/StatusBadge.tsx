import type { TextStyle, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';
import { borderWidth, colors, radius, spacing, typography } from '@/theme/tokens';

export type StatusBadgeTone = 'neutral' | 'accent' | 'success' | 'info' | 'warning' | 'danger';

interface StatusBadgeProps {
  label: string;
  tone?: StatusBadgeTone;
}

export function StatusBadge({ label, tone = 'neutral' }: StatusBadgeProps) {
  return (
    <View style={[styles.badge, toneStyles[tone].badge]}>
      <Text style={[styles.label, toneStyles[tone].label]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.pill,
    borderWidth: borderWidth.regular,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: spacing.xxs + 1,
  },
  label: {
    ...typography.badge,
  },
});

const toneStyles: Record<StatusBadgeTone, { badge: ViewStyle; label: TextStyle }> = {
  neutral: {
    badge: {
      backgroundColor: colors.surfaceMuted,
      borderColor: colors.borderStrong,
    },
    label: {
      color: colors.textSecondary,
    },
  },
  accent: {
    badge: {
      backgroundColor: colors.accentSoft,
      borderColor: 'rgba(120, 86, 255, 0.28)',
    },
    label: {
      color: '#C9BDFF',
    },
  },
  success: {
    badge: {
      backgroundColor: colors.successSoft,
      borderColor: 'rgba(83, 215, 166, 0.26)',
    },
    label: {
      color: colors.success,
    },
  },
  info: {
    badge: {
      backgroundColor: colors.infoSoft,
      borderColor: 'rgba(138, 165, 255, 0.24)',
    },
    label: {
      color: colors.info,
    },
  },
  warning: {
    badge: {
      backgroundColor: colors.warningSoft,
      borderColor: 'rgba(242, 181, 93, 0.24)',
    },
    label: {
      color: colors.warning,
    },
  },
  danger: {
    badge: {
      backgroundColor: colors.dangerSoft,
      borderColor: 'rgba(255, 124, 147, 0.26)',
    },
    label: {
      color: colors.danger,
    },
  },
};
