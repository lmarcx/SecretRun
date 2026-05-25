import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '@/theme/tokens';
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
  trendDelta?: number | undefined;
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
  trendDelta,
  variant = 'user',
}: RunnerRowProps) {
  return (
    <View style={[styles.row, highlighted && styles.rowHighlighted]}>
      {/* rank */}
      <Text style={styles.rank}>{rank}</Text>

      {/* avatar */}
      <RunnerAvatarSmall avatarUrl={avatarUrl} title={title} variant={variant} />

      {/* identity */}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text numberOfLines={1} style={styles.name}>
            {title}
          </Text>
          {badgeLabel ? <StatusBadge compact label={badgeLabel} tone="accent" /> : null}
        </View>
        {subtitle ? (
          <Text numberOfLines={1} style={styles.handle}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {/* pts + trend */}
      <View style={styles.trailing}>
        <View style={styles.ptsBlock}>
          <Text style={styles.pts}>{points.toLocaleString()}</Text>
          <Text style={styles.ptsLabel}>pts</Text>
        </View>
        <TrendChip delta={trendDelta} trend={trend} />
      </View>
    </View>
  );
}

function RunnerAvatarSmall({
  avatarUrl,
  title,
  variant,
}: {
  title: string;
  avatarUrl?: string | null | undefined;
  variant: RunnerRowVariant;
}) {
  if (avatarUrl && variant === 'user') {
    return <LeaderboardAvatar avatarUrl={avatarUrl} label={title} size="sm" variant={variant} />;
  }

  const initial = title.trim().charAt(0).toUpperCase() || '?';
  const bg = (AVATAR_COLORS[initial.charCodeAt(0) % AVATAR_COLORS.length] ?? AVATAR_COLORS[0]) as [string, string];

  return (
    <LinearGradient
      colors={bg}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.avatarGrad}
    >
      <Text style={styles.avatarInitial}>{initial}</Text>
    </LinearGradient>
  );
}

function TrendChip({ trend, delta }: { trend: Trend; delta?: number | undefined }) {
  if (trend === 'up') {
    return (
      <View style={styles.trendRow}>
        <Ionicons color="#4ECCA3" name="arrow-up" size={10} />
        {delta != null && <Text style={styles.trendUp}>+{delta}</Text>}
      </View>
    );
  }

  if (trend === 'down') {
    return (
      <View style={styles.trendRow}>
        <Ionicons color="#FF6B6B" name="arrow-down" size={10} />
        {delta != null && <Text style={styles.trendDown}>-{delta}</Text>}
      </View>
    );
  }

  return null;
}

const AVATAR_COLORS: [string, string][] = [
  ['#FF6B53', '#FF9853'],
  ['#4A90D9', '#6AB0F5'],
  ['#4ECCA3', '#2EAF84'],
  ['#F5A623', '#F5C823'],
  ['#9B59B6', '#C39BD3'],
  ['#E74C3C', '#F1948A'],
];

const styles = StyleSheet.create({
  row: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowHighlighted: {
    borderColor: 'rgba(130,80,255,0.28)',
    backgroundColor: 'rgba(130,80,255,0.07)',
  },
  rank: {
    fontFamily: fonts.syne800,
    fontSize: 14,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.35)',
    minWidth: 24,
    textAlign: 'center',
  },
  avatarGrad: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarInitial: {
    fontFamily: fonts.dmSans600,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
    color: '#fff',
  },
  info: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontFamily: fonts.dmSans600,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    color: '#fff',
    flexShrink: 1,
  },
  handle: {
    fontFamily: fonts.dmSans400,
    fontSize: 11,
    lineHeight: 15,
    color: 'rgba(255,255,255,0.35)',
  },
  trailing: {
    alignItems: 'flex-end',
    gap: 2,
    flexShrink: 0,
  },
  ptsBlock: {
    alignItems: 'flex-end',
  },
  pts: {
    fontFamily: fonts.syne800,
    fontSize: 16,
    lineHeight: 20,
    color: '#fff',
  },
  ptsLabel: {
    fontFamily: fonts.dmSans400,
    fontSize: 9,
    lineHeight: 12,
    color: 'rgba(255,255,255,0.30)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  trendUp: {
    fontFamily: fonts.dmSans600,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    color: '#4ECCA3',
  },
  trendDown: {
    fontFamily: fonts.dmSans600,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    color: '#FF6B6B',
  },
});
