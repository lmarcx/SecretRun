import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { MyRankCard } from '@/components/ui/MyRankCard';
import { PodiumTop3, type PodiumEntry } from '@/components/ui/PodiumTop3';
import { RunnerRow, type Trend } from '@/components/ui/RunnerRow';
import { EmptyState } from '@/components/ui/EmptyState';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { useBottomContentPadding } from '@/hooks/useBottomContentPadding';
import { useAuth, type BetaAccessState } from '@/hooks/useAuth';
import type { LeaderboardData } from '@/services/leaderboardService';
import { fetchLeaderboard, getLeaderboardErrorMessage } from '@/services/leaderboardService';
import { colors, fonts, spacing } from '@/theme/tokens';

type LeaderboardBoard = 'runners' | 'teams';

interface LeaderboardListItem {
  id: string;
  rank: number;
  points: number;
  title: string;
  subtitle?: string;
  variant: 'user' | 'team';
  avatarUrl?: string | null;
  highlighted: boolean;
  badgeLabel?: string;
  trend: Trend;
}

export default function LeaderboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ board?: string }>();
  const { betaAccessState } = useAuth();
  const [board, setBoard] = useState<LeaderboardBoard>(resolveBoardParam(params.board));
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const bottomContentPadding = useBottomContentPadding();

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const nextData = await fetchLeaderboard();
        if (!active) return;
        setData(nextData);
      } catch (err) {
        if (!active) return;
        setError(getLeaderboardErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => { active = false; };
  }, [reloadKey]);

  useEffect(() => {
    setBoard(resolveBoardParam(params.board));
  }, [params.board]);

  const rows = useMemo<LeaderboardListItem[]>(() => {
    if (!data) return [];

    if (board === 'runners') {
      return data.users.map((entry, index) => {
        const profileMissing = !entry.displayName && !entry.username;
        const title = profileMissing
          ? 'Hidden runner'
          : entry.displayName || entry.username || 'Hidden runner';

        return {
          id: entry.id,
          rank: entry.rank ?? index + 1,
          points: entry.points,
          title,
          subtitle: profileMissing
            ? 'Profile hidden'
            : entry.username
            ? `@${entry.username}`
            : 'Runner',
          variant: 'user' as const,
          avatarUrl: entry.avatarUrl,
          highlighted: data.currentUserId === entry.id,
          trend: 'stable' as Trend,
          ...(data.currentUserId === entry.id ? { badgeLabel: 'You' } : {}),
        };
      });
    }

    return data.teams.map((entry, index) => ({
      id: entry.id,
      rank: entry.rank ?? index + 1,
      points: entry.points,
      title: entry.name ?? 'Unknown team',
      subtitle: 'Season standing',
      variant: 'team' as const,
      highlighted: data.currentTeamIds.includes(entry.id),
      trend: 'stable' as Trend,
      ...(data.currentTeamIds.includes(entry.id) ? { badgeLabel: 'Your team' } : {}),
    }));
  }, [board, data]);

  const podiumEntries = useMemo<PodiumEntry[]>(
    () =>
      rows.slice(0, 3).map((item) => ({
        id: item.id,
        title: item.title,
        points: item.points,
        avatarUrl: item.avatarUrl,
        variant: item.variant,
      })),
    [rows],
  );

  const listRows = rows.slice(3);
  const currentEntry = useMemo(() => rows.find((item) => item.highlighted) ?? null, [rows]);
  const currentHighlightId = currentEntry?.id ?? null;

  const signedOut =
    betaAccessState === 'signed_out' || betaAccessState === 'beta_blocked';

  if (loading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={styles.loadingText}>Loading leaderboard...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <SecondaryButton
            label="Retry"
            onPress={() => setReloadKey((v) => v + 1)}
            style={styles.retryBtn}
          />
        </View>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.centered}>
          <EmptyState title="No active season yet" />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* background glow */}
      <View style={styles.glowTop} pointerEvents="none" />

      {/* custom header */}
      <View style={styles.header}>
        <Pressable
          hitSlop={8}
          onPress={() => router.canGoBack() && router.back()}
          style={styles.backBtn}
        >
          <Ionicons color="rgba(255,255,255,0.7)" name="arrow-back" size={16} />
        </Pressable>

        <Text style={styles.headerTitle}>Leaderboard</Text>

        <LinearGradient
          colors={['rgba(130,80,255,0.20)', 'rgba(255,107,53,0.15)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.seasonBadge}
        >
          <Text style={styles.seasonText}>{data.seasonName}</Text>
        </LinearGradient>
      </View>

      <FlatList
        data={listRows}
        key={board}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={[styles.listContent, { paddingBottom: bottomContentPadding }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            {/* tabs */}
            <View style={styles.tabs}>
              <Pressable
                onPress={() => setBoard('runners')}
                style={[styles.tab, board === 'runners' && styles.tabActive]}
              >
                <Ionicons
                  color={board === 'runners' ? '#B38BFF' : 'rgba(255,255,255,0.45)'}
                  name="walk-outline"
                  size={15}
                />
                <Text style={[styles.tabText, board === 'runners' && styles.tabTextActive]}>
                  Runners
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setBoard('teams')}
                style={[styles.tab, board === 'teams' && styles.tabActive]}
              >
                <Ionicons
                  color={board === 'teams' ? '#B38BFF' : 'rgba(255,255,255,0.45)'}
                  name="people-outline"
                  size={15}
                />
                <Text style={[styles.tabText, board === 'teams' && styles.tabTextActive]}>
                  Teams
                </Text>
              </Pressable>
            </View>

            {/* my rank */}
            <MyRankCard
              actionLabel={signedOut ? 'Sign in' : undefined}
              emptyMessage={getRankEmptyMessage({ betaAccessState, board })}
              identity={currentEntry?.title}
              label={board === 'runners' ? 'Your rank' : 'Your team'}
              onAction={
                signedOut
                  ? () =>
                      router.push({
                        pathname: '/(auth)/login',
                        params: { redirectTo: '/leaderboard' },
                      })
                  : undefined
              }
              points={currentEntry?.points}
              rank={currentEntry?.rank}
              variant={board === 'runners' ? 'user' : 'team'}
            />

            {/* top 3 section */}
            {podiumEntries.length >= 3 && (
              <>
                <View style={styles.sectionLabel}>
                  <View style={styles.sectionLeft}>
                    <Ionicons color="rgba(255,255,255,0.35)" name="trophy-outline" size={14} />
                    <Text style={styles.sectionTitle}>Top 3</Text>
                  </View>
                  <Text style={styles.sectionRight}>Season points</Text>
                </View>
                <PodiumTop3 entries={podiumEntries} highlightId={currentHighlightId} />
              </>
            )}

            {/* standings label */}
            <View style={styles.sectionLabel}>
              <Text style={styles.sectionTitle}>
                {board === 'runners' ? 'Standings' : 'Team standings'}
              </Text>
              {listRows.length > 0 && (
                <Text style={styles.sectionRange}>
                  {`${rows[3]?.rank ?? 4}–${rows[rows.length - 1]?.rank ?? rows.length}`}
                </Text>
              )}
            </View>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <EmptyState title={board === 'runners' ? 'No runners ranked yet' : 'No teams ranked yet'} />
        }
        renderItem={({ item }) => (
          <RunnerRow
            avatarUrl={item.avatarUrl}
            badgeLabel={item.badgeLabel}
            highlighted={item.highlighted}
            points={item.points}
            rank={item.rank}
            subtitle={item.subtitle}
            title={item.title}
            trend={item.trend}
            variant={item.variant}
          />
        )}
      />
    </View>
  );
}

function resolveBoardParam(value: string | string[] | undefined): LeaderboardBoard {
  const resolved = Array.isArray(value) ? value[0] : value;
  return resolved === 'teams' ? 'teams' : 'runners';
}

function getRankEmptyMessage({
  betaAccessState,
  board,
}: {
  betaAccessState: BetaAccessState;
  board: LeaderboardBoard;
}) {
  if (board === 'teams') {
    return betaAccessState === 'signed_out' || betaAccessState === 'beta_blocked'
      ? 'Sign in with an invited beta account to pin your team.'
      : 'No linked team yet.';
  }

  return betaAccessState === 'signed_out' || betaAccessState === 'beta_blocked'
    ? 'Sign in with an invited beta account to pin your rank.'
    : 'No personal rank yet.';
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0A0A0F',
    position: 'relative',
  },
  glowTop: {
    position: 'absolute',
    top: -60,
    left: '50%',
    marginLeft: -140,
    width: 280,
    height: 180,
    borderRadius: 140,
    backgroundColor: 'rgba(130,80,255,0.12)',
    zIndex: 0,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fonts.syne700,
    fontSize: 17,
    lineHeight: 22,
    color: '#fff',
    letterSpacing: 0.3,
  },
  seasonBadge: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(130,80,255,0.40)',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  seasonText: {
    fontFamily: fonts.dmSans600,
    fontSize: 11,
    lineHeight: 15,
    color: '#B38BFF',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  list: {
    flex: 1,
    zIndex: 2,
  },
  listContent: {
    flexGrow: 1,
  },
  listHeader: {
    gap: spacing.md,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: spacing.xs,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    padding: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tabActive: {
    backgroundColor: 'rgba(130,80,255,0.25)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(130,80,255,0.35)',
  },
  tabText: {
    fontFamily: fonts.dmSans600,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.45)',
  },
  tabTextActive: {
    color: '#B38BFF',
  },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 2,
  },
  sectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sectionTitle: {
    fontFamily: fonts.dmSans600,
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  sectionRight: {
    fontFamily: fonts.dmSans500,
    fontSize: 11,
    lineHeight: 15,
    color: 'rgba(255,255,255,0.35)',
  },
  sectionRange: {
    fontFamily: fonts.dmSans600,
    fontSize: 11,
    lineHeight: 15,
    color: 'rgba(130,80,255,0.80)',
    fontWeight: '600',
  },
  separator: {
    height: 8,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: spacing.sm,
  },
  loadingText: {
    fontFamily: fonts.dmSans500,
    fontSize: 15,
    lineHeight: 21,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorText: {
    fontFamily: fonts.dmSans500,
    fontSize: 15,
    lineHeight: 21,
    color: colors.danger,
    textAlign: 'center',
    maxWidth: 320,
  },
  retryBtn: {
    minWidth: 180,
  },
});
