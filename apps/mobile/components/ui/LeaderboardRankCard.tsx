import { StyleSheet, Text, View } from 'react-native';
import { borderWidth, colors, radius, spacing, typography } from '@/theme/tokens';
import { LeaderboardAvatar } from './LeaderboardAvatar';
import { SecondaryButton } from './SecondaryButton';
import { SectionCard } from './SectionCard';
import { StatusBadge, type StatusBadgeTone } from './StatusBadge';

type LeaderboardRankCardVariant = 'user' | 'team';

interface LeaderboardRankCardProps {
  label: string;
  contextLabel: string;
  identity?: string | null | undefined;
  subtitle?: string | undefined;
  rank?: number | null | undefined;
  points?: number | null | undefined;
  variant?: LeaderboardRankCardVariant;
  avatarUrl?: string | null | undefined;
  emptyMessage?: string | undefined;
  actionLabel?: string | undefined;
  onAction?: (() => void) | undefined;
}

export function LeaderboardRankCard({
  actionLabel,
  avatarUrl,
  contextLabel,
  emptyMessage,
  identity,
  label,
  onAction,
  points,
  rank,
  subtitle,
  variant = 'user',
}: LeaderboardRankCardProps) {
  const hasRank = identity && rank != null && points != null;

  if (!hasRank) {
    return (
      <SectionCard accessory={<StatusBadge compact label={contextLabel} muted tone="neutral" />} title={label} tone="muted">
        <Text style={styles.emptyText}>{emptyMessage ?? 'No rank yet.'}</Text>
        {actionLabel && onAction ? <SecondaryButton compact label={actionLabel} onPress={onAction} /> : null}
      </SectionCard>
    );
  }

  const tone = getPlacementTone(rank);

  return (
    <SectionCard accessory={<StatusBadge compact label={contextLabel} tone={tone} />} title={label} tone="accent">
      <View style={styles.identityRow}>
        <View style={styles.identityBlock}>
          <LeaderboardAvatar avatarUrl={avatarUrl} label={identity} variant={variant} />
          <View style={styles.copy}>
            <Text numberOfLines={1} style={styles.identity}>
              {identity}
            </Text>
            {subtitle ? (
              <Text numberOfLines={1} style={styles.subtitle}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={[styles.rankChip, toneStyles[tone]]}>
          <Text style={[styles.rankChipText, toneLabelStyles[tone]]}>#{rank}</Text>
        </View>
      </View>

      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Rank</Text>
          <Text style={styles.metricValue}>#{rank}</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Points</Text>
          <Text style={styles.metricValue}>{points.toLocaleString()}</Text>
        </View>
      </View>
    </SectionCard>
  );
}

function getPlacementTone(rank: number): StatusBadgeTone {
  if (rank === 1) {
    return 'accent';
  }

  if (rank === 2) {
    return 'info';
  }

  if (rank === 3) {
    return 'warning';
  }

  return 'neutral';
}

const styles = StyleSheet.create({
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  identityBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  copy: {
    flex: 1,
    gap: spacing.xxs,
  },
  identity: {
    ...typography.cardTitle,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.bodySm,
    color: colors.textMuted,
  },
  rankChip: {
    minWidth: 58,
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: borderWidth.regular,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  rankChipText: {
    fontSize: 19,
    lineHeight: 23,
    fontWeight: '700',
  },
  metrics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.sm,
    borderWidth: borderWidth.regular,
    borderColor: colors.border,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  metric: {
    flex: 1,
    gap: spacing.xxs,
  },
  metricLabel: {
    ...typography.eyebrow,
    color: colors.textMuted,
  },
  metricValue: {
    ...typography.cardTitle,
    color: colors.textPrimary,
  },
  metricDivider: {
    width: borderWidth.regular,
    alignSelf: 'stretch',
    backgroundColor: colors.border,
  },
  emptyText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
});

const toneStyles = StyleSheet.create({
  neutral: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.borderStrong,
  },
  accent: {
    backgroundColor: colors.accentSoft,
    borderColor: 'rgba(120, 86, 255, 0.28)',
  },
  success: {
    backgroundColor: colors.successSoft,
    borderColor: 'rgba(83, 215, 166, 0.26)',
  },
  info: {
    backgroundColor: colors.infoSoft,
    borderColor: 'rgba(138, 165, 255, 0.24)',
  },
  warning: {
    backgroundColor: colors.warningSoft,
    borderColor: 'rgba(242, 181, 93, 0.24)',
  },
  danger: {
    backgroundColor: colors.dangerSoft,
    borderColor: 'rgba(255, 124, 147, 0.26)',
  },
});

const toneLabelStyles = StyleSheet.create({
  neutral: {
    color: colors.textPrimary,
  },
  accent: {
    color: '#D4CCFF',
  },
  success: {
    color: colors.success,
  },
  info: {
    color: colors.info,
  },
  warning: {
    color: colors.warning,
  },
  danger: {
    color: colors.danger,
  },
});
