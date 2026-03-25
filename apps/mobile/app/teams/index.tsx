import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { ActionBar } from '@/components/ui/ActionBar';
import { AppScreen } from '@/components/ui/AppScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { InfoRow } from '@/components/ui/InfoRow';
import { LeaderboardRow } from '@/components/ui/LeaderboardRow';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { SectionCard } from '@/components/ui/SectionCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatusStrip } from '@/components/ui/StatusStrip';
import { TeamOverviewCard } from '@/components/ui/TeamOverviewCard';
import { useBottomContentPadding } from '@/hooks/useBottomContentPadding';
import { useAuth } from '@/hooks/useAuth';
import type { LeaderboardData } from '@/services/leaderboardService';
import { fetchLeaderboard } from '@/services/leaderboardService';
import type { TeamListItem, TeamsData } from '@/services/teamsService';
import { fetchTeams, getTeamsErrorMessage } from '@/services/teamsService';
import { colors, spacing, typography } from '@/theme/tokens';

interface TeamDiscoveryItem extends TeamListItem {
  rank: number | null;
  points: number | null;
}

export default function TeamsScreen() {
  const router = useRouter();
  const { betaAccessState } = useAuth();
  const [teamsData, setTeamsData] = useState<TeamsData | null>(null);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const bottomContentPadding = useBottomContentPadding();

  const openTeamDetails = (teamId: string) => {
    router.push({ pathname: '/teams/[id]', params: { id: teamId } });
  };

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      const [teamsResult, leaderboardResult] = await Promise.allSettled([fetchTeams(), fetchLeaderboard()]);
      if (!active) {
        return;
      }

      if (teamsResult.status === 'rejected') {
        setError(getTeamsErrorMessage(teamsResult.reason));
        setTeamsData(null);
        setLeaderboardData(null);
        setLoading(false);
        return;
      }

      setTeamsData(teamsResult.value);
      setLeaderboardData(leaderboardResult.status === 'fulfilled' ? leaderboardResult.value : null);
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const currentTeam = useMemo(
    () => teamsData?.items.find((item) => item.isCurrentUserMember) ?? null,
    [teamsData?.items],
  );

  const currentTeamStanding = useMemo(() => {
    if (!currentTeam || !leaderboardData) {
      return null;
    }

    return leaderboardData.teams.find((item) => item.id === currentTeam.id) ?? null;
  }, [currentTeam, leaderboardData]);

  const discoveryTeams = useMemo<TeamDiscoveryItem[]>(() => {
    if (!teamsData) {
      return [];
    }

    return teamsData.items
      .filter((item) => item.id !== currentTeam?.id)
      .map((item) => {
        const standing = leaderboardData?.teams.find((entry) => entry.id === item.id) ?? null;

        return {
          ...item,
          rank: standing?.rank ?? null,
          points: standing?.points ?? null,
        };
      });
  }, [currentTeam?.id, leaderboardData, teamsData]);

  const standingRows = useMemo(() => {
    if (!leaderboardData) {
      return [];
    }

    return leaderboardData.teams.map((entry, index) => {
      const team = teamsData?.items.find((item) => item.id === entry.id) ?? null;

      return {
        id: entry.id,
        rank: entry.rank ?? index + 1,
        points: entry.points,
        title: team?.name ?? entry.name ?? 'Unknown team',
        subtitle:
          team?.memberCount != null ? `${team.memberCount} ${team.memberCount === 1 ? 'member' : 'members'}` : 'Team',
        highlighted: currentTeam?.id === entry.id,
      };
    });
  }, [currentTeam?.id, leaderboardData, teamsData?.items]);

  const headerItems = getHeaderItems({
    betaAccessState,
    seasonName: leaderboardData?.seasonName ?? null,
    supportsMembershipDetails: teamsData?.supportsMembershipDetails ?? false,
  });

  if (loading) {
    return (
      <AppScreen scrollable={false} contentContainerStyle={styles.centered}>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={styles.info}>Loading teams...</Text>
      </AppScreen>
    );
  }

  if (error || !teamsData) {
    return (
      <AppScreen scrollable={false} contentContainerStyle={styles.centered}>
        <Text style={styles.title}>Teams</Text>
        <Text style={styles.error}>{error ?? 'Teams unavailable.'}</Text>
        <SecondaryButton label="Retry" onPress={() => setReloadKey((value) => value + 1)} style={styles.stateButton} />
      </AppScreen>
    );
  }

  return (
    <AppScreen contentContainerStyle={[styles.content, { paddingBottom: bottomContentPadding }]}>
      <ScreenHeader title="Teams" subtitle="Squads and season standing." />
      {headerItems.length > 0 ? <StatusStrip compact muted items={headerItems} /> : null}

      {currentTeam ? (
        <SectionCard accessory={undefined} title="My Team" tone="accent">
          <View style={styles.currentHeader}>
            <Text style={styles.currentTeamName}>{currentTeam.name}</Text>
            <Text style={styles.currentTeamLine}>
              {currentTeamStanding?.rank != null ? `Season rank #${currentTeamStanding.rank}` : 'Season squad'}
            </Text>
          </View>
          <InfoRow
            label="Members"
            value={formatMemberCount(currentTeam.memberCount, teamsData.supportsMembershipDetails)}
          />
          <InfoRow label="Rank" value={currentTeamStanding?.rank != null ? `#${currentTeamStanding.rank}` : 'Unranked'} />
          <InfoRow label="Points" value={currentTeamStanding?.points != null ? String(currentTeamStanding.points) : '0'} />
          <ActionBar
            primary={
              <PrimaryButton label="Open" onPress={() => openTeamDetails(currentTeam.id)} />
            }
          />
        </SectionCard>
      ) : (
        <SectionCard title="My Team" tone="muted">
          <EmptyState title={betaAccessState === 'signed_out' ? 'Sign in to link a team' : 'No team yet'} />
          {betaAccessState === 'signed_out' ? (
            <ActionBar primary={<PrimaryButton label="Sign in" onPress={() => router.push('/(auth)/login')} />} />
          ) : null}
        </SectionCard>
      )}

      <View style={styles.section}>
        <SectionHeader title="Discover" subtitle="Browse squads" />
        {discoveryTeams.length > 0 ? (
          <View style={styles.cards}>
            {discoveryTeams.map((item) => (
              <TeamOverviewCard
                key={item.id}
                actionLabel="View"
                badgeLabel={item.rank != null ? `#${item.rank}` : undefined}
                badgeTone={item.rank != null && item.rank <= 3 ? getPlacementTone(item.rank) : 'neutral'}
                highlighted={item.isCurrentUserMember}
                metaItems={[
                  { label: 'Members', value: formatMemberCount(item.memberCount, teamsData.supportsMembershipDetails) },
                  { label: 'Rank', value: item.rank != null ? `#${item.rank}` : 'Unranked' },
                  { label: 'Points', value: item.points != null ? String(item.points) : '0' },
                ]}
                onAction={() => openTeamDetails(item.id)}
                subtitle={getTeamDescriptor(item)}
                title={item.name}
              />
            ))}
          </View>
        ) : (
          <EmptyState title="No teams to browse" />
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader title="Standings" subtitle="Season team points" />
        {standingRows.length > 0 ? (
          <View style={styles.rows}>
            {standingRows.map((item) => (
              <LeaderboardRow
                key={item.id}
                highlighted={item.highlighted}
                points={item.points}
                rank={item.rank}
                subtitle={item.subtitle}
                title={item.title}
                variant="team"
                {...(item.highlighted ? { badgeLabel: 'Your team' } : {})}
              />
            ))}
          </View>
        ) : (
          <EmptyState title="No team standings yet" />
        )}
      </View>
    </AppScreen>
  );
}

function getHeaderItems({
  betaAccessState,
  seasonName,
  supportsMembershipDetails,
}: {
  betaAccessState: 'loading' | 'signed_in' | 'signed_out' | 'dev_runner' | 'auth_unavailable';
  seasonName: string | null;
  supportsMembershipDetails: boolean;
}) {
  return [
    ...(seasonName ? [{ label: seasonName, tone: 'accent' as const }] : []),
    ...(betaAccessState === 'dev_runner' ? [{ label: 'DEV local', tone: 'warning' as const }] : []),
    ...(betaAccessState === 'signed_out' ? [{ label: 'Guest view', tone: 'neutral' as const }] : []),
    ...(supportsMembershipDetails ? [{ label: 'Members live', tone: 'info' as const }] : []),
  ];
}

function getTeamDescriptor(item: TeamListItem) {
  if (item.isCurrentUserMember) {
    return 'Your current squad';
  }

  return 'Closed beta squad';
}

function formatMemberCount(memberCount: number | null, supportsMembershipDetails: boolean) {
  if (!supportsMembershipDetails || memberCount === null) {
    return 'Hidden';
  }

  return `${memberCount}`;
}

function getPlacementTone(rank: number) {
  if (rank === 1) {
    return 'accent' as const;
  }

  if (rank === 2) {
    return 'info' as const;
  }

  if (rank === 3) {
    return 'warning' as const;
  }

  return 'neutral' as const;
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  title: {
    ...typography.heroTitle,
    color: colors.textPrimary,
  },
  info: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  error: {
    ...typography.body,
    color: colors.danger,
    textAlign: 'center',
    maxWidth: 320,
  },
  stateButton: {
    minWidth: 180,
  },
  section: {
    gap: spacing.sm,
  },
  currentHeader: {
    gap: spacing.xxs,
  },
  currentTeamName: {
    ...typography.cardTitle,
    color: colors.textPrimary,
  },
  currentTeamLine: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  cards: {
    gap: spacing.sm,
  },
  rows: {
    gap: spacing.sm,
  },
});
