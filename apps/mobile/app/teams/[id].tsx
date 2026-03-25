import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { ActionBar } from '@/components/ui/ActionBar';
import { AppScreen } from '@/components/ui/AppScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { InfoRow } from '@/components/ui/InfoRow';
import { LeaderboardAvatar } from '@/components/ui/LeaderboardAvatar';
import { LeaderboardRow } from '@/components/ui/LeaderboardRow';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { SectionCard } from '@/components/ui/SectionCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StatusStrip } from '@/components/ui/StatusStrip';
import { useBottomContentPadding } from '@/hooks/useBottomContentPadding';
import { useAuth, type BetaAccessState } from '@/hooks/useAuth';
import type { TeamDetailsData, TeamMemberDetails, TeamMembershipState } from '@/services/teamsService';
import { fetchTeamDetails, getTeamDetailsErrorMessage } from '@/services/teamsService';
import { borderWidth, colors, radius, spacing, typography } from '@/theme/tokens';

export default function TeamDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const teamId = useMemo(() => (Array.isArray(params.id) ? params.id[0] : params.id) ?? null, [params.id]);
  const { betaAccessState } = useAuth();
  const [team, setTeam] = useState<TeamDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const bottomContentPadding = useBottomContentPadding();

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!teamId) {
        setTeam(null);
        setError('Team unavailable.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const nextTeam = await fetchTeamDetails(teamId);
        if (!active) {
          return;
        }

        setTeam(nextTeam);
      } catch (err) {
        if (!active) {
          return;
        }

        setError(getTeamDetailsErrorMessage(err));
        setTeam(null);
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
  }, [reloadKey, teamId]);

  const headerItems = useMemo(() => {
    if (!team) {
      return [];
    }

    return [
      ...(team.standing?.seasonName ? [{ label: team.standing.seasonName, tone: 'accent' as const }] : []),
      ...(team.supportsMembershipDetails ? [{ label: 'Members live', tone: 'info' as const }] : []),
      ...(betaAccessState === 'signed_out' ? [{ label: 'Guest view', tone: 'neutral' as const }] : []),
    ];
  }, [betaAccessState, team]);

  const primaryAction = useMemo(
    () =>
      getPrimaryAction({
        membershipState: team?.membershipState ?? 'not_member',
        onRequest: () => {
          if (betaAccessState === 'signed_out') {
            router.push('/(auth)/login');
            return;
          }

          if (betaAccessState === 'signed_in') {
            Alert.alert('Requests soon', 'Team join requests are not connected yet in this beta.');
            return;
          }

          Alert.alert('Sign-in required', 'Team requests need a signed-in beta account on this device.');
        },
      }),
    [betaAccessState, router, team?.membershipState],
  );

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Team' }} />
        <AppScreen scrollable={false} contentContainerStyle={styles.centered}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={styles.info}>Loading team...</Text>
        </AppScreen>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Stack.Screen options={{ title: 'Team' }} />
        <AppScreen scrollable={false} contentContainerStyle={styles.centered}>
          <Text style={styles.title}>Team</Text>
          <Text style={styles.error}>{error}</Text>
          <SecondaryButton label="Retry" onPress={() => setReloadKey((value) => value + 1)} style={styles.stateButton} />
        </AppScreen>
      </>
    );
  }

  if (!team) {
    return (
      <>
        <Stack.Screen options={{ title: 'Team' }} />
        <AppScreen scrollable={false} contentContainerStyle={styles.centered}>
          <Text style={styles.title}>Team</Text>
          <EmptyState title="Team unavailable" description="This squad is not visible right now." />
          <SecondaryButton label="Back" onPress={() => router.back()} style={styles.stateButton} />
        </AppScreen>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: team.name }} />
      <AppScreen contentContainerStyle={[styles.content, { paddingBottom: bottomContentPadding }]}>
        <ScreenHeader eyebrow="Team" title={team.name} subtitle={team.descriptor} />
        {headerItems.length > 0 ? <StatusStrip compact muted items={headerItems} /> : null}

        <SectionCard accessory={<StatusBadge compact label={getMembershipLabel(team.membershipState)} tone={getMembershipTone(team.membershipState)} />} tone={team.isCurrentUserMember ? 'accent' : 'default'}>
          <View style={styles.heroRow}>
            <LeaderboardAvatar label={team.name} variant="team" />
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>{team.name}</Text>
              <Text style={styles.heroSubtitle}>{team.descriptor}</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <StatCard
              helper={team.supportsMembershipDetails ? 'Live roster' : 'Private in guest view'}
              label="Members"
              value={formatMemberCount(team.memberCount, team.supportsMembershipDetails)}
            />
            <StatCard
              helper={team.standing?.seasonName ?? 'Season'}
              label="Rank"
              value={team.standing?.rank != null ? `#${team.standing.rank}` : 'Unranked'}
            />
            <StatCard helper="Season total" label="Points" value={`${team.standing?.points ?? 0}`} />
          </View>

          <ActionBar
            primary={<PrimaryButton disabled={primaryAction.disabled} label={primaryAction.label} onPress={primaryAction.onPress} />}
          />
        </SectionCard>

        <View style={styles.section}>
          <SectionHeader title="Status" subtitle="Membership and access" />
          <SectionCard>
            <InfoRow label="Membership" tone={getInfoTone(team.membershipState)} value={getMembershipLabel(team.membershipState)} />
            <InfoRow label="Request" tone={getInfoTone(team.membershipState)} value={getRequestLabel(team.membershipState)} />
            <InfoRow label="Access" value={getAccessLabel(team, betaAccessState)} />
            <InfoRow label="Founded" value={formatFoundedDate(team.createdAt)} />
          </SectionCard>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Members" subtitle={team.supportsMembershipDetails ? 'Compact squad view' : 'Private in guest mode'} />
          {team.supportsMembershipDetails ? (
            team.members.length > 0 ? (
              <View style={styles.memberList}>
                {team.members.map((member) => (
                  <MemberRow key={member.id} member={member} />
                ))}
                {team.memberCount != null && team.memberCount > team.members.length ? (
                  <EmptyState title={`+${team.memberCount - team.members.length} more members`} />
                ) : null}
              </View>
            ) : (
              <EmptyState title="No members listed yet" />
            )
          ) : (
            <SectionCard tone="muted">
              <EmptyState title="Sign in to view members" />
              {betaAccessState === 'signed_out' ? (
                <ActionBar primary={<PrimaryButton label="Sign in" onPress={() => router.push('/(auth)/login')} />} />
              ) : null}
            </SectionCard>
          )}
        </View>

        <View style={styles.section}>
          <SectionHeader title="Standing" subtitle="Season team points" />
          {team.standing ? (
            <View style={styles.standingCard}>
              {team.standing.rank != null ? (
                <LeaderboardRow
                  {...(team.isCurrentUserMember ? { badgeLabel: 'Your team' } : {})}
                  highlighted={team.isCurrentUserMember}
                  points={team.standing.points}
                  rank={team.standing.rank}
                  subtitle={team.standing.seasonName}
                  title={team.name}
                  variant="team"
                />
              ) : (
                <SectionCard>
                  <InfoRow label="Season" value={team.standing.seasonName} />
                  <InfoRow label="Rank" value="Unranked" />
                  <InfoRow label="Points" value={`${team.standing.points}`} />
                </SectionCard>
              )}
              <ActionBar
                primary={
                  <SecondaryButton
                    compact
                    label="Open leaderboard"
                    onPress={() => router.push({ pathname: '/leaderboard', params: { board: 'teams', scope: 'season' } })}
                  />
                }
              />
            </View>
          ) : (
            <EmptyState title="No season standing yet" description="Points land here after validated runs." />
          )}
        </View>
      </AppScreen>
    </>
  );
}

function MemberRow({ member }: { member: TeamMemberDetails }) {
  return (
    <View style={styles.memberRow}>
      <View style={styles.memberIdentity}>
        <LeaderboardAvatar avatarUrl={member.avatarUrl} label={member.displayName} size="sm" />
        <View style={styles.memberCopy}>
          <Text numberOfLines={1} style={styles.memberName}>
            {member.displayName}
          </Text>
          <Text numberOfLines={1} style={styles.memberHandle}>
            {member.username ? `@${member.username}` : member.isCaptain ? 'Team captain' : 'Member'}
          </Text>
        </View>
      </View>

      <View style={styles.memberBadges}>
        {member.isCaptain ? <StatusBadge compact label="Captain" tone="info" /> : null}
        {member.isCurrentUser ? <StatusBadge compact label="You" tone="accent" /> : null}
      </View>
    </View>
  );
}

function getPrimaryAction({
  membershipState,
  onRequest,
}: {
  membershipState: TeamMembershipState;
  onRequest: () => void;
}) {
  if (membershipState === 'member') {
    return {
      label: 'Open team',
      disabled: true,
      onPress: undefined,
    };
  }

  if (membershipState === 'pending') {
    return {
      label: 'Pending',
      disabled: true,
      onPress: undefined,
    };
  }

  return {
    label: 'Request to join',
    disabled: false,
    onPress: onRequest,
  };
}

function getMembershipLabel(membershipState: TeamMembershipState) {
  switch (membershipState) {
    case 'member':
      return 'Member';
    case 'pending':
      return 'Pending';
    default:
      return 'Not a member';
  }
}

function getRequestLabel(membershipState: TeamMembershipState) {
  switch (membershipState) {
    case 'member':
      return 'Approved';
    case 'pending':
      return 'Awaiting approval';
    default:
      return 'Not sent';
  }
}

function getMembershipTone(membershipState: TeamMembershipState) {
  switch (membershipState) {
    case 'member':
      return 'success' as const;
    case 'pending':
      return 'warning' as const;
    default:
      return 'neutral' as const;
  }
}

function getInfoTone(membershipState: TeamMembershipState) {
  switch (membershipState) {
    case 'member':
      return 'success' as const;
    case 'pending':
      return 'warning' as const;
    default:
      return 'muted' as const;
  }
}

function getAccessLabel(team: TeamDetailsData, betaAccessState: BetaAccessState) {
  if (!team.supportsMembershipDetails && betaAccessState === 'signed_out') {
    return 'Guest view keeps the roster private';
  }

  if (team.membershipState === 'member') {
    return 'Full team profile unlocked';
  }

  if (team.membershipState === 'pending') {
    return 'Access opens after approval';
  }

  return 'Requests open soon for beta members';
}

function formatMemberCount(memberCount: number | null, supportsMembershipDetails: boolean) {
  if (!supportsMembershipDetails || memberCount === null) {
    return 'Hidden';
  }

  return `${memberCount}`;
}

function formatFoundedDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
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
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  heroCopy: {
    flex: 1,
    gap: spacing.xxs,
  },
  heroTitle: {
    ...typography.cardTitle,
    color: colors.textPrimary,
  },
  heroSubtitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  memberList: {
    gap: spacing.sm,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: borderWidth.regular,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  memberIdentity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  memberCopy: {
    flex: 1,
    gap: spacing.xxs,
  },
  memberName: {
    ...typography.body,
    color: colors.textPrimary,
  },
  memberHandle: {
    ...typography.bodySm,
    color: colors.textMuted,
  },
  memberBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  standingCard: {
    gap: spacing.sm,
  },
});
