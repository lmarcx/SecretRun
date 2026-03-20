import { StyleSheet, Text, View } from 'react-native';
import { borderWidth, colors, radius, spacing, typography } from '@/theme/tokens';
import { LeaderboardAvatar } from './LeaderboardAvatar';
import { StatusBadge } from './StatusBadge';

type LeaderboardRowVariant = 'user' | 'team';

interface LeaderboardRowProps {
  rank: number;
  title: string;
  subtitle?: string | undefined;
  points: number;
  variant?: LeaderboardRowVariant;
  avatarUrl?: string | null | undefined;
  badgeLabel?: string | undefined;
  highlighted?: boolean | undefined;
}

export function LeaderboardRow({
  avatarUrl,
  badgeLabel,
  highlighted = false,
  points,
  rank,
  subtitle,
  title,
  variant = 'user',
}: LeaderboardRowProps) {
  const tone = getPlacementTone(rank);

  return (
    <View style={[styles.card, highlighted && styles.cardHighlighted]}>
      <View style={[styles.rankBlock, rankToneStyles[tone]]}>
        <Text style={[styles.rankText, rankLabelStyles[tone]]}>#{rank}</Text>
      </View>

      <View style={styles.identity}>
        <LeaderboardAvatar avatarUrl={avatarUrl} label={title} size="sm" variant={variant} />
        <View style={styles.copy}>
          <View style={styles.titleRow}>
            <Text numberOfLines={1} style={styles.title}>
              {title}
            </Text>
            {badgeLabel ? <StatusBadge compact label={badgeLabel} tone="accent" /> : null}
          </View>
          {subtitle ? (
            <Text numberOfLines={1} style={styles.subtitle}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.score}>
        <Text numberOfLines={1} style={styles.points}>
          {points.toLocaleString()}
        </Text>
        <Text style={styles.pointsLabel}>pts</Text>
      </View>
    </View>
  );
}

function getPlacementTone(rank: number) {
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: borderWidth.regular,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  cardHighlighted: {
    borderColor: 'rgba(120, 86, 255, 0.28)',
    backgroundColor: colors.surfaceElevated,
  },
  rankBlock: {
    minWidth: 48,
    minHeight: 40,
    borderRadius: radius.sm,
    borderWidth: borderWidth.regular,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  rankText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  identity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  copy: {
    flex: 1,
    gap: spacing.xxs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    flexShrink: 1,
    ...typography.body,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.bodySm,
    color: colors.textMuted,
  },
  score: {
    minWidth: 68,
    alignItems: 'flex-end',
    gap: 1,
  },
  points: {
    ...typography.cardTitle,
    color: colors.textPrimary,
  },
  pointsLabel: {
    ...typography.eyebrow,
    color: colors.textMuted,
  },
});

const rankToneStyles = StyleSheet.create({
  neutral: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.borderStrong,
  },
  accent: {
    backgroundColor: colors.accentSoft,
    borderColor: 'rgba(120, 86, 255, 0.28)',
  },
  info: {
    backgroundColor: colors.infoSoft,
    borderColor: 'rgba(138, 165, 255, 0.24)',
  },
  warning: {
    backgroundColor: colors.warningSoft,
    borderColor: 'rgba(242, 181, 93, 0.24)',
  },
});

const rankLabelStyles = StyleSheet.create({
  neutral: {
    color: colors.textPrimary,
  },
  accent: {
    color: '#D4CCFF',
  },
  info: {
    color: colors.info,
  },
  warning: {
    color: colors.warning,
  },
});
