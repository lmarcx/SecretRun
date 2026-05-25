import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing } from '@/theme/tokens';
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
  emptyMessage,
  identity,
  label,
  onAction,
  points,
  rank,
}: MyRankCardProps) {
  const hasRank = identity && rank != null && points != null;

  if (!hasRank) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyLabel}>{label}</Text>
        <Text style={styles.emptyText}>{emptyMessage ?? 'No rank yet.'}</Text>
        {actionLabel && onAction ? (
          <SecondaryButton compact label={actionLabel} onPress={onAction} />
        ) : null}
      </View>
    );
  }

  return (
    <LinearGradient
      colors={['rgba(130,80,255,0.15)', 'rgba(255,107,53,0.08)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      {/* glow orb top-right */}
      <View style={styles.glowOrb} pointerEvents="none" />

      {/* rank number */}
      <Text style={styles.rankNum}>#{rank}</Text>

      {/* divider */}
      <View style={styles.divider} />

      {/* info */}
      <View style={styles.info}>
        <Text style={styles.rankLabel}>{label}</Text>
        <Text numberOfLines={1} style={styles.rankName}>{identity}</Text>
        <View style={styles.trend}>
          <Ionicons color="#4ECCA3" name="trending-up" size={12} />
          <Text style={styles.trendText}>Season standing</Text>
        </View>
      </View>

      {/* points */}
      <View style={styles.ptsBlock}>
        <Text style={styles.ptsVal}>{points.toLocaleString()}</Text>
        <Text style={styles.ptsLabel}>pts</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 0,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(130,80,255,0.30)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
  },
  glowOrb: {
    position: 'absolute',
    right: -20,
    top: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(130,80,255,0.15)',
  },
  rankNum: {
    fontFamily: fonts.syne800,
    fontSize: 32,
    lineHeight: 36,
    color: '#B38BFF',
    minWidth: 58,
  },
  divider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  rankLabel: {
    fontFamily: fonts.dmSans600,
    fontSize: 11,
    lineHeight: 14,
    color: 'rgba(255,255,255,0.45)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '600',
  },
  rankName: {
    fontFamily: fonts.dmSans600,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    color: '#fff',
  },
  trend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  trendText: {
    fontFamily: fonts.dmSans500,
    fontSize: 11,
    lineHeight: 14,
    color: '#4ECCA3',
    fontWeight: '600',
  },
  ptsBlock: {
    alignItems: 'flex-end',
  },
  ptsVal: {
    fontFamily: fonts.syne800,
    fontSize: 20,
    lineHeight: 24,
    color: '#fff',
  },
  ptsLabel: {
    fontFamily: fonts.dmSans500,
    fontSize: 10,
    lineHeight: 13,
    color: 'rgba(255,255,255,0.40)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  emptyCard: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: spacing.xs,
  },
  emptyLabel: {
    fontFamily: fonts.dmSans600,
    fontSize: 11,
    lineHeight: 14,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '600',
  },
  emptyText: {
    fontFamily: fonts.dmSans500,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
});
