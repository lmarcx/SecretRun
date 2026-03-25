import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '@/components/ui/AppScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { LeaderboardRankCard } from '@/components/ui/LeaderboardRankCard';
import { LeaderboardRow } from '@/components/ui/LeaderboardRow';
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
type LeaderboardScope = 'season' | 'weekly' | 'global';

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
}

export default function LeaderboardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ board?: string; scope?: string }>();
  const { betaAccessState } = useAuth();
  const [board, setBoard] = useState<LeaderboardBoard>(resolveBoardParam(params.board));
  const [scope, setScope] = useState<LeaderboardScope>(resolveScopeParam(params.scope));
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
        if (!active) {
          return;
        }

        setData(nextData);
      } catch (err) {
        if (!active) {
          return;
        }

        setError(getLeaderboardErrorMessage(err));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [reloadKey]);

  useEffect(() => {
    setBoard(resolveBoardParam(params.board));
  }, [params.board]);

  useEffect(() => {
    setScope(resolveScopeParam(params.scope));
  }, [params.scope]);

  const rows = useMemo<LeaderboardListItem[]>(() => {
    if (!data || scope !== 'season') {
      return [];
    }

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
      ...(data.currentTeamIds.includes(entry.id) ? { badgeLabel: 'Your team' } : {}),
    }));
  }, [board, data, scope]);

  const currentEntry = useMemo(() => rows.find((item) => item.highlighted) ?? null, [rows]);
  const scopeSupported = scope === 'season';
  const scopeLabel = getScopeLabel(scope);
  const headerItems = getHeaderItems({ betaAccessState, seasonName: data?.seasonName ?? null, scope });

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
        <SecondaryButton label="Retry" onPress={() => setReloadKey((value) => value + 1)} style={styles.stateButton} />
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
        data={scopeSupported ? rows : []}
        key={`${scope}-${board}`}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={[styles.listContent, { paddingBottom: bottomContentPadding }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <ScreenHeader title="Leaderboard" subtitle={getHeaderSubtitle(scope, board)} />
            {headerItems.length > 0 ? <StatusStrip compact muted items={headerItems} /> : null}
            <SegmentedTabs
              items={[
                { key: 'season', label: 'Season' },
                { key: 'weekly', label: 'Weekly' },
                { key: 'global', label: 'Global' },
              ]}
              onChange={(nextValue) => setScope(nextValue as LeaderboardScope)}
              value={scope}
            />
            <SegmentedTabs
              compact
              items={[
                { key: 'runners', label: 'Runners' },
                { key: 'teams', label: 'Teams' },
              ]}
              onChange={(nextValue) => setBoard(nextValue as LeaderboardBoard)}
              value={board}
            />
            <LeaderboardRankCard
              actionLabel={betaAccessState === 'signed_out' ? 'Sign in' : undefined}
              avatarUrl={currentEntry?.avatarUrl}
              contextLabel={scopeLabel}
              emptyMessage={getRankEmptyMessage({ betaAccessState, board, scopeSupported })}
              identity={currentEntry?.title}
              label={board === 'runners' ? 'Your rank' : 'Your team'}
              onAction={betaAccessState === 'signed_out' ? () => router.push('/(auth)/login') : undefined}
              points={currentEntry?.points}
              rank={currentEntry?.rank}
              subtitle={currentEntry?.subtitle}
              variant={board === 'runners' ? 'user' : 'team'}
            />
            <SectionHeader
              {...(scopeSupported ? { subtitle: board === 'runners' ? 'Season points' : 'Season team points' } : {})}
              title={scopeSupported ? (board === 'runners' ? 'Standings' : 'Team standings') : scopeLabel}
            />
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={<EmptyState title={getEmptyTitle({ board, scope, scopeSupported })} />}
        renderItem={({ item }) => (
          <LeaderboardRow
            avatarUrl={item.avatarUrl}
            badgeLabel={item.badgeLabel}
            highlighted={item.highlighted}
            points={item.points}
            rank={item.rank}
            subtitle={item.subtitle}
            title={item.title}
            variant={item.variant}
          />
        )}
      />
    </AppScreen>
  );
}

function getHeaderSubtitle(scope: LeaderboardScope, board: LeaderboardBoard) {
  if (scope === 'season') {
    return board === 'runners' ? 'Season standings' : 'Season team standings';
  }

  return `${getScopeLabel(scope)} ranking`;
}

function resolveBoardParam(value: string | string[] | undefined): LeaderboardBoard {
  const resolved = Array.isArray(value) ? value[0] : value;
  return resolved === 'teams' ? 'teams' : 'runners';
}

function resolveScopeParam(value: string | string[] | undefined): LeaderboardScope {
  const resolved = Array.isArray(value) ? value[0] : value;

  if (resolved === 'weekly' || resolved === 'global') {
    return resolved;
  }

  return 'season';
}

function getScopeLabel(scope: LeaderboardScope) {
  switch (scope) {
    case 'weekly':
      return 'Weekly';
    case 'global':
      return 'Global';
    default:
      return 'Season';
  }
}

function getHeaderItems({
  betaAccessState,
  seasonName,
  scope,
}: {
  betaAccessState: BetaAccessState;
  seasonName: string | null;
  scope: LeaderboardScope;
}) {
  return [
    ...(scope === 'season' && seasonName ? [{ label: seasonName, tone: 'accent' as const }] : []),
    ...(betaAccessState === 'dev_runner' ? [{ label: 'DEV local', tone: 'warning' as const }] : []),
    ...(betaAccessState === 'signed_out' ? [{ label: 'Guest view', tone: 'neutral' as const }] : []),
  ];
}

function getRankEmptyMessage({
  betaAccessState,
  board,
  scopeSupported,
}: {
  betaAccessState: BetaAccessState;
  board: LeaderboardBoard;
  scopeSupported: boolean;
}) {
  if (!scopeSupported) {
    return 'This scope is not live yet.';
  }

  if (board === 'teams') {
    return betaAccessState === 'signed_out' ? 'Sign in to pin your team.' : 'No linked team yet.';
  }

  return betaAccessState === 'signed_out' ? 'Sign in to pin your rank.' : 'No personal rank yet.';
}

function getEmptyTitle({
  board,
  scope,
  scopeSupported,
}: {
  board: LeaderboardBoard;
  scope: LeaderboardScope;
  scopeSupported: boolean;
}) {
  if (!scopeSupported) {
    return `${getScopeLabel(scope)} ranking soon`;
  }

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
