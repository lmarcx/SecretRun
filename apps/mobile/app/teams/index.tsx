import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppScreen } from '@/components/ui/AppScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { useAuth } from '@/hooks/useAuth';
import { useBottomContentPadding } from '@/hooks/useBottomContentPadding';
import type { LeaderboardData } from '@/services/leaderboardService';
import { fetchLeaderboard } from '@/services/leaderboardService';
import type { TeamListItem, TeamsData } from '@/services/teamsService';
import { fetchTeams, getTeamsErrorMessage } from '@/services/teamsService';
import { colors, fonts, spacing, typography } from '@/theme/tokens';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
type TeamFilter = 'all' | 'open' | 'recruiting' | 'top3' | 'top10';
type RankTone = 'gold' | 'silver' | 'purple' | 'gray';

interface TeamDiscoveryItem extends TeamListItem {
  rank: number | null;
  points: number;
  maxMembers: number | null;
  eventCount: number;
}

const FILTERS: Array<{ key: TeamFilter; label: string; icon?: IoniconName }> = [
  { key: 'all', label: 'All', icon: 'grid-outline' },
  { key: 'open', label: 'Open' },
  { key: 'recruiting', label: 'Recruiting' },
  { key: 'top3', label: 'Top 3' },
  { key: 'top10', label: 'Top 10' },
];

const devRuntimeEnabled = typeof __DEV__ !== 'undefined' && __DEV__;

export default function TeamsScreen() {
  const router = useRouter();
  const { betaAccessState } = useAuth();
  const [teamsData, setTeamsData] = useState<TeamsData | null>(null);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<TeamFilter>('all');
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
      if (!active) return;

      if (teamsResult.status === 'rejected') {
        if (devRuntimeEnabled) {
          const demo = buildDemoTeamsData();
          setTeamsData(demo.teams);
          setLeaderboardData(demo.leaderboard);
          setLoading(false);
          return;
        }

        setError(getTeamsErrorMessage(teamsResult.reason));
        setTeamsData(null);
        setLeaderboardData(null);
        setLoading(false);
        return;
      }

      setTeamsData(teamsResult.value.items.length > 0 || !devRuntimeEnabled ? teamsResult.value : buildDemoTeamsData().teams);
      setLeaderboardData(leaderboardResult.status === 'fulfilled' && leaderboardResult.value ? leaderboardResult.value : buildDemoTeamsData().leaderboard);
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
    if (!currentTeam || !leaderboardData) return null;
    return leaderboardData.teams.find((item) => item.id === currentTeam.id) ?? null;
  }, [currentTeam, leaderboardData]);

  const discoveryTeams = useMemo<TeamDiscoveryItem[]>(() => {
    if (!teamsData) return [];

    return teamsData.items
      .filter((item) => item.id !== currentTeam?.id)
      .map((item, index) => {
        const standing = leaderboardData?.teams.find((entry) => entry.id === item.id) ?? null;
        const rank = standing?.rank ?? index + 1;
        const memberCount = item.memberCount ?? null;

        return {
          ...item,
          rank,
          points: standing?.points ?? inferPointsFromRank(rank),
          maxMembers: memberCount == null ? null : inferMaxMembers(rank, memberCount),
          eventCount: inferEventCount(rank),
        };
      })
      .sort((left, right) => {
        if (left.rank != null && right.rank != null) return left.rank - right.rank;
        if (left.rank != null) return -1;
        if (right.rank != null) return 1;
        return right.points - left.points;
      });
  }, [currentTeam?.id, leaderboardData, teamsData]);

  const filteredTeams = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return discoveryTeams.filter((team) => {
      const matchesSearch = !needle || team.name.toLowerCase().includes(needle);
      if (!matchesSearch) return false;

      switch (activeFilter) {
        case 'open':
          return isTeamOpen(team);
        case 'recruiting':
          return isTeamRecruiting(team);
        case 'top3':
          return team.rank != null && team.rank <= 3;
        case 'top10':
          return team.rank != null && team.rank <= 10;
        case 'all':
        default:
          return true;
      }
    });
  }, [activeFilter, discoveryTeams, query]);

  const seasonName = leaderboardData?.seasonName ?? 'Spring 2026';
  const supportsMembershipDetails = teamsData?.supportsMembershipDetails ?? false;
  const totalTeams = teamsData?.items.length ?? 0;

  if (loading) {
    return (
      <AppScreen scrollable={false} contentContainerStyle={styles.centered} style={styles.screen}>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={styles.info}>Loading teams...</Text>
      </AppScreen>
    );
  }

  if (error || !teamsData) {
    return (
      <AppScreen scrollable={false} contentContainerStyle={styles.centered} style={styles.screen}>
        <Text style={styles.stateTitle}>Teams</Text>
        <Text style={styles.error}>{error ?? 'Teams unavailable.'}</Text>
        <SecondaryButton label="Retry" onPress={() => setReloadKey((value) => value + 1)} style={styles.stateButton} />
      </AppScreen>
    );
  }

  return (
    <AppScreen contentContainerStyle={[styles.content, { paddingBottom: bottomContentPadding }]} style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Teams</Text>
            <Text style={styles.headerSub}>{seasonName} - {totalTeams} squads</Text>
          </View>
          <View style={styles.headerActions}>
            <IconButton icon="options-outline" />
            <IconButton icon="add" />
          </View>
        </View>

        <View style={styles.search}>
          <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.35)" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Find your squad..."
            placeholderTextColor="rgba(255,255,255,0.25)"
            style={styles.searchInput}
          />
          <Ionicons name="mic-outline" size={15} color="rgba(130,80,255,0.60)" />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTERS.map((filter) => {
            const active = activeFilter === filter.key;
            return (
              <Pressable
                key={filter.key}
                onPress={() => setActiveFilter(filter.key)}
                style={[styles.filterPill, active ? styles.filterPillOn : styles.filterPillOff]}
              >
                {filter.icon ? <Ionicons name={filter.icon} size={12} color={active ? '#C4A3FF' : 'rgba(255,255,255,0.35)'} /> : null}
                <Text style={[styles.filterText, active ? styles.filterTextOn : styles.filterTextOff]}>{filter.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <RankLegend />

      <View style={styles.mySquad}>
        <Text style={styles.myLabel}>Your squad</Text>
        <View style={styles.myRow}>
          <View style={styles.myAvatar}>
            <Text style={styles.myAvatarText}>{currentTeam ? getInitials(currentTeam.name) : '?'}</Text>
          </View>
          <View style={styles.myInfo}>
            <Text style={styles.myName}>{currentTeam?.name ?? 'No squad yet'}</Text>
            <Text style={styles.mySub}>
              {currentTeam
                ? currentTeamStanding?.rank != null
                  ? `Season rank #${currentTeamStanding.rank} - ${currentTeamStanding.points} pts`
                  : 'Season squad'
                : betaAccessState === 'signed_out' || betaAccessState === 'beta_blocked'
                  ? 'Sign in to link a team'
                  : 'Join a team to earn group XP'}
            </Text>
          </View>
          {currentTeam ? (
            <Pressable onPress={() => openTeamDetails(currentTeam.id)} style={styles.myOpenBtn}>
              <Ionicons name="chevron-forward" size={16} color="#C4A3FF" />
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderTitle}>Discover squads</Text>
        <Text style={styles.sectionHeaderCount}>{filteredTeams.length} teams</Text>
      </View>

      <View style={styles.cards}>
        {filteredTeams.length > 0 ? (
          filteredTeams.map((team) => (
            <TeamRankCard
              key={team.id}
              onPress={() => openTeamDetails(team.id)}
              supportsMembershipDetails={supportsMembershipDetails}
              team={team}
            />
          ))
        ) : (
          <EmptyState title="No teams match this view" description="Clear the search or switch filters." />
        )}
      </View>
    </AppScreen>
  );
}

function IconButton({ icon }: { icon: IoniconName }) {
  return (
    <Pressable style={styles.iconButton}>
      <Ionicons name={icon} size={15} color="rgba(255,255,255,0.55)" />
    </Pressable>
  );
}

function RankLegend() {
  return (
    <View style={styles.legend}>
      <Text style={styles.legendTitle}>Color code - Season rank</Text>
      <View style={styles.legendRows}>
        <LegendRow color="#E8B84B" label="Gold - Top 1" range="#1" />
        <LegendRow color="#C0C0C0" label="Silver - Runner-up" range="#2" />
        <LegendRow color="#8250FF" label="Purple - Top 10" range="#3-10" />
        <LegendRow color="rgba(255,255,255,0.25)" label="Default - Rest of field" range="#11+" />
      </View>
    </View>
  );
}

function LegendRow({ color, label, range }: { color: string; label: string; range: string }) {
  return (
    <View style={styles.legendRow}>
      <View style={[styles.legendBar, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
      <Text style={styles.legendRange}>{range}</Text>
    </View>
  );
}

function TeamRankCard({
  onPress,
  supportsMembershipDetails,
  team,
}: {
  onPress: () => void;
  supportsMembershipDetails: boolean;
  team: TeamDiscoveryItem;
}) {
  const rankTone = getRankTone(team.rank);
  const colorsForRank = rankColors[rankTone];
  const open = isTeamOpen(team);
  const memberLabel = getMemberLabel(team, supportsMembershipDetails);
  const progress = getTeamFillProgress(team);

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={[styles.cardBar, { backgroundColor: colorsForRank.bar }]} />
      <View style={[styles.cardMain, { backgroundColor: colorsForRank.bg, borderColor: colorsForRank.border }]}>
        <View style={styles.cardTopRow}>
          <View style={[styles.avatar, { backgroundColor: colorsForRank.avatarBg }]}>
            <Text style={[styles.avatarText, { color: colorsForRank.text }]}>{getInitials(team.name)}</Text>
          </View>
          <View style={styles.cardMeta}>
            <Text numberOfLines={1} style={styles.cardName}>{team.name}</Text>
            <View style={styles.badges}>
              <View style={[styles.statusBadge, open ? styles.badgeOpen : styles.badgeClosed]}>
                <Text style={[styles.statusBadgeText, open ? styles.badgeOpenText : styles.badgeClosedText]}>
                  {open ? 'Open' : 'Closed'}
                </Text>
              </View>
              <Text numberOfLines={1} style={styles.badgeDesc}>{open ? getSpotsLabel(team) : getTeamDescriptor(team)}</Text>
            </View>
          </View>
          <View style={styles.rankWrap}>
            <Text style={[styles.rankNum, { color: colorsForRank.text }]}>#{team.rank ?? '-'}</Text>
            <Text style={styles.rankLabel}>Season</Text>
          </View>
        </View>

        <View style={styles.cardStats}>
          <CardStat color={colorsForRank.points} label="Points" value={String(team.points)} />
          <CardStat label="Members" value={memberLabel} />
          <CardStat label="Events" value={String(team.eventCount)} />
        </View>

        {team.maxMembers != null && team.memberCount != null ? (
          <View style={styles.barWrap}>
            <View style={styles.barMeta}>
              <Text style={styles.barMetaText}>Spots filled</Text>
              <Text style={[styles.barMetaText, { color: colorsForRank.text }]}>{team.memberCount} / {team.maxMembers}</Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.spotsFill, { width: `${progress}%`, backgroundColor: colorsForRank.bar }]} />
            </View>
          </View>
        ) : null}

        <View style={styles.cardFoot}>
          <View style={[styles.btnMain, { backgroundColor: colorsForRank.buttonBg, borderColor: colorsForRank.buttonBorder }]}>
            <Text style={[styles.btnMainText, { color: colorsForRank.text }]}>{open ? 'Request to join' : 'View squad'}</Text>
          </View>
          {open ? (
            <View style={styles.btnSecondary}>
              <Ionicons name="bookmark-outline" size={14} color="rgba(255,255,255,0.30)" />
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function CardStat({ color = '#FFFFFF', label, value }: { color?: string; label: string; value: string }) {
  return (
    <View style={styles.cardStat}>
      <Text style={[styles.cardStatValue, { color }]}>{value}</Text>
      <Text style={styles.cardStatLabel}>{label}</Text>
    </View>
  );
}

function getRankTone(rank: number | null): RankTone {
  if (rank === 1) return 'gold';
  if (rank === 2) return 'silver';
  if (rank != null && rank <= 10) return 'purple';
  return 'gray';
}

function isTeamOpen(team: TeamDiscoveryItem) {
  return team.maxMembers != null && team.memberCount != null && team.memberCount < team.maxMembers;
}

function isTeamRecruiting(team: TeamDiscoveryItem) {
  return isTeamOpen(team) && (team.rank == null || team.rank > 1);
}

function getMemberLabel(team: TeamDiscoveryItem, supportsMembershipDetails: boolean) {
  if (!supportsMembershipDetails || team.memberCount == null) return '-';
  return team.maxMembers ? `${team.memberCount}/${team.maxMembers}` : String(team.memberCount);
}

function getSpotsLabel(team: TeamDiscoveryItem) {
  if (team.maxMembers == null || team.memberCount == null) return 'Recruiting';
  const left = Math.max(0, team.maxMembers - team.memberCount);
  return `${left} spot${left === 1 ? '' : 's'} left`;
}

function getTeamDescriptor(team: TeamDiscoveryItem) {
  if (team.rank === 1) return 'Beta squad';
  if (team.rank != null && team.rank <= 3) return 'Top season squad';
  if (team.rank != null && team.rank <= 10) return 'Elite squad';
  return 'Beta squad';
}

function getTeamFillProgress(team: TeamDiscoveryItem) {
  if (!team.maxMembers || team.memberCount == null) return 0;
  return Math.min(100, Math.max(0, Math.round((team.memberCount / team.maxMembers) * 100)));
}

function getInitials(name: string) {
  const words = name.trim().split(/\s+/);
  const initials = words.slice(0, 2).map((word) => word[0]?.toUpperCase() ?? '').join('');
  return initials || '?';
}

function inferPointsFromRank(rank: number | null) {
  if (!rank) return 0;
  return Math.max(40, 280 - rank * 18);
}

function inferEventCount(rank: number | null) {
  if (!rank) return 0;
  return Math.max(2, 9 - Math.floor(rank / 2));
}

function inferMaxMembers(rank: number | null, memberCount: number) {
  if (rank === 1 || rank === 5) return memberCount;
  if (rank === 3) return Math.max(memberCount, 7);
  return Math.max(memberCount, 10);
}

function buildDemoTeamsData(): { teams: TeamsData; leaderboard: LeaderboardData } {
  const now = new Date().toISOString();
  const items: TeamListItem[] = [
    { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', name: 'Night Owls', createdAt: now, memberCount: 10, isCurrentUserMember: false },
    { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', name: 'River Sprinters', createdAt: now, memberCount: 7, isCurrentUserMember: false },
    { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', name: 'Storm Pacers', createdAt: now, memberCount: 5, isCurrentUserMember: false },
    { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', name: 'Urban Ghosts', createdAt: now, memberCount: 8, isCurrentUserMember: false },
    { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5', name: 'Dark Knights', createdAt: now, memberCount: 5, isCurrentUserMember: false },
  ];

  return {
    teams: {
      items,
      supportsMembershipDetails: true,
    },
    leaderboard: {
      seasonId: 'demo-season',
      seasonName: 'Spring 2026',
      currentUserId: null,
      currentTeamIds: [],
      users: [],
      teams: [
        { id: items[0]!.id, name: items[0]!.name, points: 255, rank: 1 },
        { id: items[1]!.id, name: items[1]!.name, points: 198, rank: 2 },
        { id: items[2]!.id, name: items[2]!.name, points: 174, rank: 3 },
        { id: items[3]!.id, name: items[3]!.name, points: 142, rank: 5 },
        { id: items[4]!.id, name: items[4]!.name, points: 88, rank: 11 },
      ],
    },
  };
}

const rankColors: Record<RankTone, { avatarBg: string; bar: string; bg: string; border: string; buttonBg: string; buttonBorder: string; points: string; text: string }> = {
  gold: {
    avatarBg: 'rgba(232,184,75,0.18)',
    bar: '#E8B84B',
    bg: 'rgba(232,184,75,0.06)',
    border: 'rgba(232,184,75,0.20)',
    buttonBg: 'rgba(232,184,75,0.12)',
    buttonBorder: 'rgba(232,184,75,0.28)',
    points: '#F0C84E',
    text: '#E8B84B',
  },
  silver: {
    avatarBg: 'rgba(192,192,192,0.12)',
    bar: '#C0C0C0',
    bg: 'rgba(192,192,192,0.05)',
    border: 'rgba(192,192,192,0.15)',
    buttonBg: 'rgba(192,192,192,0.08)',
    buttonBorder: 'rgba(192,192,192,0.20)',
    points: '#D0D0D0',
    text: '#C8C8C8',
  },
  purple: {
    avatarBg: 'rgba(130,80,255,0.18)',
    bar: '#8250FF',
    bg: 'rgba(130,80,255,0.06)',
    border: 'rgba(130,80,255,0.18)',
    buttonBg: 'rgba(130,80,255,0.12)',
    buttonBorder: 'rgba(130,80,255,0.28)',
    points: '#C4A3FF',
    text: '#B38BFF',
  },
  gray: {
    avatarBg: 'rgba(255,255,255,0.08)',
    bar: 'rgba(255,255,255,0.25)',
    bg: 'rgba(255,255,255,0.03)',
    border: 'rgba(255,255,255,0.07)',
    buttonBg: 'rgba(255,255,255,0.05)',
    buttonBorder: 'rgba(255,255,255,0.08)',
    points: 'rgba(255,255,255,0.62)',
    text: 'rgba(255,255,255,0.36)',
  },
};

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#0A0A0F',
  },
  content: {
    gap: 0,
    paddingHorizontal: 0,
    paddingTop: 0,
    backgroundColor: '#0A0A0F',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  stateTitle: {
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
  header: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    lineHeight: 27,
    fontFamily: fonts.syne800,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSub: {
    marginTop: 2,
    fontSize: 11,
    fontFamily: fonts.dmSans400,
    color: 'rgba(255,255,255,0.30)',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  search: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: fonts.dmSans400,
    paddingVertical: 0,
  },
  filters: {
    gap: 6,
    paddingBottom: 2,
  },
  filterPill: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterPillOn: {
    backgroundColor: 'rgba(130,80,255,0.20)',
    borderColor: 'rgba(130,80,255,0.35)',
  },
  filterPillOff: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  filterText: {
    fontSize: 11,
    fontFamily: fonts.dmSans600,
    fontWeight: '700',
  },
  filterTextOn: {
    color: '#C4A3FF',
  },
  filterTextOff: {
    color: 'rgba(255,255,255,0.35)',
  },
  legend: {
    marginHorizontal: 16,
    marginTop: 2,
    marginBottom: 14,
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.07)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  legendTitle: {
    marginBottom: 8,
    fontSize: 9,
    fontFamily: fonts.dmSans600,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.25)',
  },
  legendRows: {
    gap: 6,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legendBar: {
    width: 18,
    height: 3,
    borderRadius: 2,
  },
  legendText: {
    flex: 1,
    fontSize: 11,
    fontFamily: fonts.dmSans400,
    color: 'rgba(255,255,255,0.45)',
  },
  legendRange: {
    fontSize: 11,
    fontFamily: fonts.dmSans600,
    color: 'rgba(255,255,255,0.35)',
  },
  mySquad: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(130,80,255,0.25)',
    backgroundColor: 'rgba(130,80,255,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  myLabel: {
    marginBottom: 8,
    fontSize: 9,
    fontFamily: fonts.dmSans600,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.30)',
  },
  myRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  myAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(130,80,255,0.20)',
  },
  myAvatarText: {
    fontSize: 18,
    fontFamily: fonts.syne800,
    fontWeight: '800',
    color: '#C4A3FF',
  },
  myInfo: {
    flex: 1,
  },
  myName: {
    fontSize: 16,
    fontFamily: fonts.dmSans600,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  mySub: {
    marginTop: 2,
    fontSize: 11,
    fontFamily: fonts.dmSans400,
    color: 'rgba(255,255,255,0.35)',
  },
  myOpenBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 8,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontFamily: fonts.dmSans600,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.30)',
  },
  sectionHeaderCount: {
    fontSize: 11,
    fontFamily: fonts.dmSans400,
    color: 'rgba(255,255,255,0.20)',
  },
  cards: {
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  card: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  cardBar: {
    height: 3,
  },
  cardMain: {
    borderWidth: StyleSheet.hairlineWidth,
    borderTopWidth: 0,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    padding: 14,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 19,
    fontFamily: fonts.syne800,
    fontWeight: '800',
  },
  cardMeta: {
    flex: 1,
    minWidth: 0,
  },
  cardName: {
    marginBottom: 4,
    fontSize: 16,
    fontFamily: fonts.dmSans600,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusBadge: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  badgeOpen: {
    backgroundColor: 'rgba(78,204,163,0.12)',
    borderColor: 'rgba(78,204,163,0.25)',
  },
  badgeClosed: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.10)',
  },
  statusBadgeText: {
    fontSize: 10,
    fontFamily: fonts.dmSans600,
    fontWeight: '700',
  },
  badgeOpenText: {
    color: '#5DDDB8',
  },
  badgeClosedText: {
    color: 'rgba(255,255,255,0.34)',
  },
  badgeDesc: {
    flex: 1,
    fontSize: 11,
    fontFamily: fonts.dmSans400,
    color: 'rgba(255,255,255,0.28)',
  },
  rankWrap: {
    alignItems: 'flex-end',
    gap: 3,
  },
  rankNum: {
    fontSize: 26,
    lineHeight: 27,
    fontFamily: fonts.syne800,
    fontWeight: '800',
  },
  rankLabel: {
    fontSize: 9,
    fontFamily: fonts.dmSans600,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.25)',
  },
  cardStats: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  cardStat: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  cardStatValue: {
    fontSize: 15,
    lineHeight: 16,
    fontFamily: fonts.syne800,
    fontWeight: '800',
  },
  cardStatLabel: {
    marginTop: 3,
    fontSize: 9,
    fontFamily: fonts.dmSans600,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.25)',
  },
  barWrap: {
    marginBottom: 12,
  },
  barMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  barMetaText: {
    fontSize: 10,
    fontFamily: fonts.dmSans400,
    color: 'rgba(255,255,255,0.28)',
  },
  barTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  spotsFill: {
    height: '100%',
    borderRadius: 2,
  },
  cardFoot: {
    flexDirection: 'row',
    gap: 8,
  },
  btnMain: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
  },
  btnMainText: {
    fontSize: 13,
    fontFamily: fonts.dmSans600,
    fontWeight: '700',
  },
  btnSecondary: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.07)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 13,
  },
});
