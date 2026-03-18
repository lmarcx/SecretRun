import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, type BetaAccessState } from '@/hooks/useAuth';
import type { LeaderboardData, TeamLeaderboardEntry, UserLeaderboardEntry } from '@/services/leaderboardService';
import { fetchLeaderboard, getLeaderboardErrorMessage } from '@/services/leaderboardService';

type LeaderboardTab = 'solo' | 'team';

export default function LeaderboardScreen() {
  const { betaAccessState } = useAuth();
  const [tab, setTab] = useState<LeaderboardTab>('solo');
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

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

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.info}>Loading leaderboard...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.title}>Leaderboard</Text>
        <Text style={styles.error}>{error}</Text>
        <Pressable style={styles.secondaryButton} onPress={() => setReloadKey((value) => value + 1)}>
          <Text style={styles.secondaryButtonText}>Retry</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.title}>Leaderboard</Text>
        <Text style={styles.info}>No active season is available yet.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {tab === 'solo' ? (
        <FlatList
          data={data.users}
          key="solo"
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={<Header seasonName={data.seasonName} tab={tab} onChangeTab={setTab} betaAccessState={betaAccessState} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.info}>No solo rankings are available yet.</Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <UserRow entry={item} fallbackRank={index + 1} isCurrentUser={data.currentUserId === item.id} />
          )}
        />
      ) : (
        <FlatList
          data={data.teams}
          key="team"
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={<Header seasonName={data.seasonName} tab={tab} onChangeTab={setTab} betaAccessState={betaAccessState} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.info}>No team rankings are available yet.</Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <TeamRow entry={item} fallbackRank={index + 1} isCurrentTeam={data.currentTeamIds.includes(item.id)} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function Header({
  seasonName,
  tab,
  onChangeTab,
  betaAccessState,
}: {
  seasonName: string;
  tab: LeaderboardTab;
  onChangeTab: (nextTab: LeaderboardTab) => void;
  betaAccessState: BetaAccessState;
}) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>Leaderboard</Text>
      <Text style={styles.subtitle}>{seasonName}</Text>
      <Text style={styles.caption}>Season totals update after completed runs finish review and scoring.</Text>
      {betaAccessState !== 'signed_in' ? (
        <View style={styles.noticeCard}>
          <Text style={styles.noticeText}>
            {betaAccessState === 'dev_runner'
              ? 'DEV runner can test events and runs locally, but personal rank and team highlighting still use a signed-in beta account.'
              : 'Sign in to highlight your own position and team. The leaderboard itself stays visible in guest mode.'}
          </Text>
        </View>
      ) : null}
      <View style={styles.toggleRow}>
        <Pressable style={[styles.toggleButton, tab === 'solo' && styles.toggleButtonActive]} onPress={() => onChangeTab('solo')}>
          <Text style={[styles.toggleText, tab === 'solo' && styles.toggleTextActive]}>Solo</Text>
        </Pressable>
        <Pressable style={[styles.toggleButton, tab === 'team' && styles.toggleButtonActive]} onPress={() => onChangeTab('team')}>
          <Text style={[styles.toggleText, tab === 'team' && styles.toggleTextActive]}>Teams</Text>
        </Pressable>
      </View>
    </View>
  );
}

function UserRow({
  entry,
  fallbackRank,
  isCurrentUser,
}: {
  entry: UserLeaderboardEntry;
  fallbackRank: number;
  isCurrentUser: boolean;
}) {
  const profileMissing = !entry.displayName && !entry.username;
  const label = profileMissing ? 'Hidden runner' : entry.displayName || entry.username || 'Hidden runner';
  const secondary = profileMissing ? 'Profile unavailable' : entry.username ? `@${entry.username}` : 'Public profile';

  return (
    <View style={[styles.card, isCurrentUser && styles.cardHighlighted]}>
      <View style={styles.rankBadge}>
        <Text style={styles.rankText}>{entry.rank ?? fallbackRank}</Text>
      </View>
      <View style={styles.identity}>
        <Avatar avatarUrl={entry.avatarUrl} fallbackLabel={label} />
        <View style={styles.identityText}>
          <View style={styles.titleRow}>
            <Text style={styles.name}>{label}</Text>
            {isCurrentUser ? (
              <View style={styles.inlineBadge}>
                <Text style={styles.inlineBadgeText}>You</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.secondary}>{secondary}</Text>
        </View>
      </View>
      <View style={styles.pointsBlock}>
        <Text style={styles.points}>{entry.points}</Text>
        <Text style={styles.pointsLabel}>pts</Text>
      </View>
    </View>
  );
}

function TeamRow({
  entry,
  fallbackRank,
  isCurrentTeam,
}: {
  entry: TeamLeaderboardEntry;
  fallbackRank: number;
  isCurrentTeam: boolean;
}) {
  return (
    <View style={[styles.card, isCurrentTeam && styles.cardHighlighted]}>
      <View style={styles.rankBadge}>
        <Text style={styles.rankText}>{entry.rank ?? fallbackRank}</Text>
      </View>
      <View style={styles.identity}>
        <View style={styles.teamBadge}>
          <Text style={styles.teamBadgeText}>{(entry.name ?? '?').slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={styles.identityText}>
          <View style={styles.titleRow}>
            <Text style={styles.name}>{entry.name ?? 'Unknown team'}</Text>
            {isCurrentTeam ? (
              <View style={styles.inlineBadge}>
                <Text style={styles.inlineBadgeText}>Your team</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.secondary}>Season team ranking</Text>
        </View>
      </View>
      <View style={styles.pointsBlock}>
        <Text style={styles.points}>{entry.points}</Text>
        <Text style={styles.pointsLabel}>pts</Text>
      </View>
    </View>
  );
}

function Avatar({ avatarUrl, fallbackLabel }: { avatarUrl: string | null; fallbackLabel: string }) {
  const initial = fallbackLabel.trim().charAt(0).toUpperCase() || '?';

  if (avatarUrl) {
    return <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />;
  }

  return (
    <View style={styles.avatarFallback}>
      <Text style={styles.avatarFallbackText}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
    backgroundColor: '#f8fafc',
  },
  list: {
    padding: 16,
    gap: 12,
  },
  header: {
    gap: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 16,
    color: '#475569',
  },
  caption: {
    color: '#64748b',
    lineHeight: 20,
  },
  noticeCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 14,
  },
  noticeText: {
    color: '#475569',
    lineHeight: 20,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  toggleButton: {
    minHeight: 42,
    minWidth: 110,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 14,
  },
  toggleButtonActive: {
    backgroundColor: '#0f172a',
  },
  toggleText: {
    color: '#0f172a',
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#ffffff',
  },
  empty: {
    paddingVertical: 24,
  },
  info: {
    textAlign: 'center',
    color: '#475569',
  },
  error: {
    textAlign: 'center',
    color: '#b91c1c',
    fontWeight: '600',
  },
  secondaryButton: {
    minHeight: 48,
    minWidth: 180,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
  },
  cardHighlighted: {
    borderColor: '#0f172a',
    backgroundColor: '#f1f5f9',
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontWeight: '700',
    color: '#0f172a',
  },
  identity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  identityText: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  secondary: {
    color: '#64748b',
    fontSize: 13,
  },
  inlineBadge: {
    borderRadius: 999,
    backgroundColor: '#dbeafe',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  inlineBadgeText: {
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: '700',
  },
  pointsBlock: {
    alignItems: 'flex-end',
  },
  points: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  pointsLabel: {
    color: '#64748b',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#cbd5e1',
  },
  teamBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamBadgeText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
