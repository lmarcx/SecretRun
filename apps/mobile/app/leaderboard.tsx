import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import type { LeaderboardData, TeamLeaderboardEntry, UserLeaderboardEntry } from '@/services/leaderboardService';
import { fetchLeaderboard, getLeaderboardErrorMessage } from '@/services/leaderboardService';

type LeaderboardTab = 'global' | 'team';

export default function LeaderboardScreen() {
  const [tab, setTab] = useState<LeaderboardTab>('global');
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  }, []);

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
      {tab === 'global' ? (
        <FlatList
          data={data.users}
          key="global"
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={<Header seasonName={data.seasonName} tab={tab} onChangeTab={setTab} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.info}>No user rankings are available yet.</Text>
            </View>
          }
          renderItem={({ item, index }) => <UserRow entry={item} fallbackRank={index + 1} />}
        />
      ) : (
        <FlatList
          data={data.teams}
          key="team"
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={<Header seasonName={data.seasonName} tab={tab} onChangeTab={setTab} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.info}>No team rankings are available yet.</Text>
            </View>
          }
          renderItem={({ item, index }) => <TeamRow entry={item} fallbackRank={index + 1} />}
        />
      )}
    </SafeAreaView>
  );
}

function Header({
  seasonName,
  tab,
  onChangeTab,
}: {
  seasonName: string;
  tab: LeaderboardTab;
  onChangeTab: (nextTab: LeaderboardTab) => void;
}) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>Leaderboard</Text>
      <Text style={styles.subtitle}>{seasonName}</Text>
      <View style={styles.toggleRow}>
        <Pressable style={[styles.toggleButton, tab === 'global' && styles.toggleButtonActive]} onPress={() => onChangeTab('global')}>
          <Text style={[styles.toggleText, tab === 'global' && styles.toggleTextActive]}>Global</Text>
        </Pressable>
        <Pressable style={[styles.toggleButton, tab === 'team' && styles.toggleButtonActive]} onPress={() => onChangeTab('team')}>
          <Text style={[styles.toggleText, tab === 'team' && styles.toggleTextActive]}>Team</Text>
        </Pressable>
      </View>
    </View>
  );
}

function UserRow({ entry, fallbackRank }: { entry: UserLeaderboardEntry; fallbackRank: number }) {
  const profileMissing = !entry.displayName && !entry.username;
  const label = profileMissing ? 'Utilisateur masqué' : entry.displayName || entry.username || 'Utilisateur masqué';
  const secondary = profileMissing
    ? 'Profil indisponible'
    : entry.username
      ? `@${entry.username}`
      : 'Profil public';

  return (
    <View style={styles.card}>
      <View style={styles.rankBadge}>
        <Text style={styles.rankText}>{entry.rank ?? fallbackRank}</Text>
      </View>
      <View style={styles.identity}>
        <Avatar avatarUrl={entry.avatarUrl} fallbackLabel={label} />
        <View style={styles.identityText}>
          <Text style={styles.name}>{label}</Text>
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

function TeamRow({ entry, fallbackRank }: { entry: TeamLeaderboardEntry; fallbackRank: number }) {
  return (
    <View style={styles.card}>
      <View style={styles.rankBadge}>
        <Text style={styles.rankText}>{entry.rank ?? fallbackRank}</Text>
      </View>
      <View style={styles.identity}>
        <View style={styles.teamBadge}>
          <Text style={styles.teamBadgeText}>{(entry.name ?? '?').slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={styles.identityText}>
          <Text style={styles.name}>{entry.name ?? 'Team inconnue'}</Text>
          <Text style={styles.secondary}>Classement equipe</Text>
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

  if (!avatarUrl) {
    return (
      <View style={styles.avatarFallback}>
        <Text style={styles.avatarFallbackText}>{initial}</Text>
      </View>
    );
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
    backgroundColor: '#f8fafc',
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
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  secondary: {
    color: '#64748b',
    fontSize: 13,
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
