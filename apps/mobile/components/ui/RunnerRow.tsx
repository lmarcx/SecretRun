import { StyleSheet, Text, View } from 'react-native';
import { borderWidth, colors, radius, spacing, typography } from '@/theme/tokens';
import { LeaderboardAvatar } from './LeaderboardAvatar';
import { StatusBadge } from './StatusBadge';

type RunnerRowVariant = 'user' | 'team';
export type Trend = 'up' | 'down' | 'stable';

interface RunnerRowProps {
  rank: number;
  title: string;
  subtitle?: string | undefined;
  points: number;
  variant?: RunnerRowVariant | undefined;
  avatarUrl?: string | null | undefined;
  badgeLabel?: string | undefined;
  highlighted?: boolean | undefined;
  trend?: Trend | undefined;
}

export function RunnerRow({
  avatarUrl,
  badgeLabel,
  highlighted = false,
  points,
  rank,
  subtitle,
  title,
  trend = 'stable',
  variant = 'user',
}: RunnerRowProps) {
  const tone = getPlacementTone(rank);

  return (
    <View style={[styles.row, highlighted && styles.rowHighlighted]}>
      <View style={[styles.rankBlock, rankBg[tone]]}>
        <Text style={[styles.rankText, rankLabel[tone]]}>#{rank}</Text>
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

      <View style={styles.trailing}>
        <TrendIndicator trend={trend} />
        <View style={styles.score}>
          <Text numberOfLines={1} style={styles.points}>
            {points.toLocaleString()}
          </Text>
          <Text style={styles.pointsLabel}>pts</Text>
        </View>
      </View>
    </View>
  );
}

function TrendIndicator({ trend }: { trend: Trend }) {
  if (trend === 'up') {
    return <Text style={styles.trendUp}>▲</Text>;
  }
  if (trend === 'down') {
    return <Text style={styles.trendDown}>▼</Text>;
  }
  return <Text style={styles.trendStable}>—</Text>;
}

function getPlacementTone(rank: number): 'accent' | 'silver' | 'bronze' | 'neutral' {
  if (rank === 1) return 'accent';
  if (rank === 2) return 'silver';
  if (rank === 3) return 'bronze';
  return 'neutral';
}

const styles = StyleSheet.create({
  row: {
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
  rowHighlighted: {
    borderColor: 'rgba(130, 80, 255, 0.30)',
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
    // fontFamily: 'Syne_700Bold', — enable after: npx expo install @expo-google-fonts/syne expo-font
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
  trailing: {
    alignItems: 'flex-end',
    gap: spacing.xxs,
  },
  score: {
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
  trendUp: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
    color: colors.success,
  },
  trendDown: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
    color: colors.danger,
  },
  trendStable: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
    color: colors.textMuted,
  },
});

const rankBg = StyleSheet.create({
  neutral: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.borderStrong,
  },
  accent: {
    backgroundColor: colors.accentSoft,
    borderColor: 'rgba(130, 80, 255, 0.28)',
  },
  silver: {
    backgroundColor: 'rgba(138,155,184,0.13)',
    borderColor: 'rgba(138,155,184,0.24)',
  },
  bronze: {
    backgroundColor: 'rgba(176,120,64,0.13)',
    borderColor: 'rgba(176,120,64,0.24)',
  },
});

const rankLabel = StyleSheet.create({
  neutral: { color: colors.textPrimary },
  accent: { color: '#D4CCFF' },
  silver: { color: '#8A9BB8' },
  bronze: { color: '#C08B50' },
});
