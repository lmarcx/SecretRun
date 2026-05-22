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
    paddingHorizontal: spacing.xs + 3,
    paddingVertical: spacing.xxs + 1,
  },
  badgeCompact: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  badgeMuted: {
    opacity: 0.70,
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
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderColor: colors.borderStrong,
    },
    label: {
      color: colors.textSecondary,
    },
  },
  accent: {
    badge: {
      backgroundColor: colors.accentSoft,
      borderColor: 'rgba(139, 92, 246, 0.30)',
    },
    label: {
      color: '#C4B5FD',
    },
  },
  success: {
    badge: {
      backgroundColor: colors.successSoft,
      borderColor: 'rgba(52, 211, 153, 0.28)',
    },
    label: {
      color: colors.success,
    },
  },
  info: {
    badge: {
      backgroundColor: colors.infoSoft,
      borderColor: 'rgba(96, 165, 250, 0.26)',
    },
    label: {
      color: colors.info,
    },
  },
  warning: {
    badge: {
      backgroundColor: colors.warningSoft,
      borderColor: 'rgba(251, 191, 36, 0.26)',
    },
    label: {
      color: colors.warning,
    },
  },
  danger: {
    badge: {
      backgroundColor: colors.dangerSoft,
      borderColor: 'rgba(248, 113, 113, 0.28)',
    },
    label: {
      color: colors.danger,
    },
  },
};
