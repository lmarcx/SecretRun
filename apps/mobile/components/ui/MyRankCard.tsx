import { StyleSheet, Text, View } from 'react-native';
import { borderWidth, colors, radius, spacing, typography } from '@/theme/tokens';
import { LeaderboardAvatar } from './LeaderboardAvatar';
import { SecondaryButton } from './SecondaryButton';

type Variant = 'user' | 'team';

interface MyRankCardProps {
  label: string;
  identity?: string | null | undefined;
  subtitle?: string | undefined;
  rank?: number | null | undefined;
  points?: number | null | undefined;
  variant?: Variant | undefined;
  avatarUrl?: string | null | undefined;
  emptyMessage?: string | undefined;
  actionLabel?: string | undefined;
  onAction?: (() => void) | undefined;
}

export function MyRankCard({
  actionLabel,
  avatarUrl,
  emptyMessage,
  identity,
  label,
  onAction,
  points,
  rank,
  subtitle,
  variant = 'user',
}: MyRankCardProps) {
  const hasRank = identity && rank != null && points != null;

  if (!hasRank) {
    return (
      <View style={[styles.card, styles.cardEmpty]}>
        <Text style={styles.emptyLabel}>{label}</Text>
        <Text style={styles.emptyText}>{emptyMessage ?? 'No rank yet.'}</Text>
        {actionLabel && onAction ? (
          <SecondaryButton compact label={actionLabel} onPress={onAction} />
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.glow} pointerEvents="none" />

      <View style={styles.topRow}>
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

        <View style={styles.contextChip}>
          <Text style={styles.contextText}>Season</Text>
        </View>
      </View>

      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>{label}</Text>
          <Text style={styles.metricValue}>
            #{rank}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Points</Text>
          <Text style={styles.metricValue}>{points.toLocaleString()}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: borderWidth.regular,
    borderColor: 'rgba(130, 80, 255, 0.30)',
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.sm,
    overflow: 'hidden',
  },
  cardEmpty: {
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'flex-start',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  glow: {
    position: 'absolute',
    top: -40,
    left: '20%',
    right: '20%',
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accentGlow,
    opacity: 0.35,
  },
  topRow: {
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
    // fontFamily: 'Syne_700Bold', — enable after: npx expo install @expo-google-fonts/syne expo-font
  },
  subtitle: {
    ...typography.bodySm,
    color: colors.textMuted,
  },
  contextChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
    borderWidth: borderWidth.regular,
    borderColor: colors.accentSoft,
    backgroundColor: colors.accentSoft,
  },
  contextText: {
    ...typography.eyebrow,
    color: colors.accent,
  },
  metrics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.sm,
    borderWidth: borderWidth.regular,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.025)',
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
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '800',
    color: colors.textPrimary,
    // fontFamily: 'Syne_700Bold',
  },
  divider: {
    width: borderWidth.regular,
    alignSelf: 'stretch',
    backgroundColor: colors.border,
  },
  emptyLabel: {
    ...typography.eyebrow,
    color: colors.textMuted,
  },
  emptyText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
});
