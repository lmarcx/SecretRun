import type { TextStyle, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';
import { borderWidth, colors, radius, spacing, typography } from '@/theme/tokens';

export type StatusBadgeTone = 'neutral' | 'accent' | 'success' | 'info' | 'warning' | 'danger';

interface StatusBadgeProps {
  label: string;
  tone?: StatusBadgeTone;
  compact?: boolean;
  muted?: boolean;
}

export function StatusBadge({ compact = false, label, muted = false, tone = 'neutral' }: StatusBadgeProps) {
  return (
    <View style={[styles.badge, compact && styles.badgeCompact, toneStyles[tone].badge, muted && styles.badgeMuted]}>
      <Text style={[styles.label, compact && styles.labelCompact, toneStyles[tone].label, muted && styles.labelMuted]}>{label}</Text>
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
  badgeCompact: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  badgeMuted: {
    opacity: 0.74,
  },
  label: {
    ...typography.badge,
  },
  labelCompact: {
    fontSize: 10,
    lineHeight: 12,
  },
  labelMuted: {
    color: colors.textMuted,
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
