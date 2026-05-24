import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '@/components/ui/AppScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { MyRankCard } from '@/components/ui/MyRankCard';
import { PodiumTop3, type PodiumEntry } from '@/components/ui/PodiumTop3';
import { RunnerRow, type Trend } from '@/components/ui/RunnerRow';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { StatusStrip } from '@/components/ui/StatusStrip';
import { useBottomContentPadding } from '@/hooks/useBottomContentPadding';
import { useAuth, type BetaAccessState } from '@/hooks/useAuth';
import type { LeaderboardData } from '@/services/leaderboardService';
import { fetchLeaderboard, getLeaderboardErrorMessage } from '@/services/leaderboardService';
import { colors, spacing, typography } from '@/theme/tokens';

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
  const params = useLocalSearchParams<{ board?: string; scope?: string }>();
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
        const title = profileMissing ? 'Hidden runner' : entry.displayName || entry.username || 'Hidden runner';

        return {
          id: entry.id,
          rank: entry.rank ?? index + 1,
          points: entry.points,
          title,
          subtitle: profileMissing ? 'Profile hidden' : entry.username ? `@${entry.username}` : 'Runner',
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
  const headerItems = getHeaderItems({ betaAccessState, seasonName: data?.seasonName ?? null });

  if (loading) {
    return (
      <AppScreen scrollable={false} contentContainerStyle={styles.centered}>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={styles.info}>Loading leaderboard...</Text>
      </AppScreen>
    );
  }

  if (error) {
    return (
      <AppScreen scrollable={false} contentContainerStyle={styles.centered}>
        <Text style={styles.title}>Leaderboard</Text>
        <Text style={styles.error}>{error}</Text>
        <SecondaryButton label="Retry" onPress={() => setReloadKey((v) => v + 1)} style={styles.stateButton} />
      </AppScreen>
    );
  }

  if (!data) {
    return (
      <AppScreen scrollable={false} contentContainerStyle={styles.centered}>
        <Text style={styles.title}>Leaderboard</Text>
        <EmptyState title="No active season yet" />
      </AppScreen>
    );
  }

  return (
    <AppScreen scrollable={false} contentContainerStyle={styles.screen}>
      <FlatList
        data={listRows}
        key={board}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={[styles.listContent, { paddingBottom: bottomContentPadding }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <ScreenHeader title="Leaderboard" subtitle={getHeaderSubtitle(board)} />

            {headerItems.length > 0 && (
              <StatusStrip compact muted items={headerItems} />
            )}

            <SegmentedTabs
              compact
              items={[
                { key: 'runners', label: 'Runners' },
                { key: 'teams', label: 'Teams' },
              ]}
              onChange={(nextValue) => setBoard(nextValue as LeaderboardBoard)}
              value={board}
            />

            {podiumEntries.length >= 3 && (
              <PodiumTop3 entries={podiumEntries} highlightId={currentHighlightId} />
            )}

            <MyRankCard
              actionLabel={
                betaAccessState === 'signed_out' || betaAccessState === 'beta_blocked'
                  ? 'Sign in'
                  : undefined
              }
              avatarUrl={currentEntry?.avatarUrl}
              emptyMessage={getRankEmptyMessage({ betaAccessState, board })}
              identity={currentEntry?.title}
              label={board === 'runners' ? 'Your rank' : 'Your team'}
              onAction={
                betaAccessState === 'signed_out' || betaAccessState === 'beta_blocked'
                  ? () =>
                      router.push({
                        pathname: '/(auth)/login',
                        params: { redirectTo: '/leaderboard' },
                      })
                  : undefined
              }
              points={currentEntry?.points}
              rank={currentEntry?.rank}
              subtitle={currentEntry?.subtitle}
              variant={board === 'runners' ? 'user' : 'team'}
            />

            <SectionHeader
              subtitle={board === 'runners' ? 'Season points' : 'Season team points'}
              title={board === 'runners' ? 'Standings' : 'Team standings'}
            />
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={<EmptyState title={getEmptyTitle({ board })} />}
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
    </AppScreen>
  );
}

function getHeaderSubtitle(board: LeaderboardBoard) {
  return board === 'runners' ? 'Season standings' : 'Season team standings';
}

function resolveBoardParam(value: string | string[] | undefined): LeaderboardBoard {
  const resolved = Array.isArray(value) ? value[0] : value;
  return resolved === 'teams' ? 'teams' : 'runners';
}

function getHeaderItems({
  betaAccessState,
  seasonName,
}: {
  betaAccessState: BetaAccessState;
  seasonName: string | null;
}) {
  return [
    ...(seasonName ? [{ label: seasonName, tone: 'accent' as const }] : []),
    ...(betaAccessState === 'dev_runner' ? [{ label: 'DEV local', tone: 'warning' as const }] : []),
    ...(betaAccessState === 'signed_out' || betaAccessState === 'beta_blocked'
      ? [{ label: 'Sign in required', tone: 'neutral' as const }]
      : []),
  ];
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

function getEmptyTitle({ board }: { board: LeaderboardBoard }) {
  return board === 'runners' ? 'No runners ranked yet' : 'No teams ranked yet';
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  list: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  header: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  title: {
    ...typography.heroTitle,
    color: colors.textPrimary,
  },
  info: {
    ...typography.body,
    textAlign: 'center',
    color: colors.textSecondary,
  },
  error: {
    ...typography.body,
    textAlign: 'center',
    color: colors.danger,
    maxWidth: 320,
  },
  stateButton: {
    minWidth: 180,
  },
  separator: {
    height: spacing.sm,
  },
});
