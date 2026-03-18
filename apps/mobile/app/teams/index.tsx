import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, type BetaAccessState } from '@/hooks/useAuth';
import { isDevRunnerActive } from '@/services/devRunnerMode';
import type { TeamListItem, TeamsData } from '@/services/teamsService';
import { fetchTeams, getTeamsErrorMessage } from '@/services/teamsService';

export default function TeamsScreen() {
  const { betaAccessState } = useAuth();
  const devRunnerActive = isDevRunnerActive();
  const [data, setData] = useState<TeamsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const nextData = await fetchTeams();
        if (!active) {
          return;
        }

        setData(nextData);
      } catch (err) {
        if (!active) {
          return;
        }

        setError(getTeamsErrorMessage(err));
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
        <Text style={styles.info}>Loading teams...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.title}>Teams</Text>
        <Text style={styles.error}>{error}</Text>
        <Pressable style={styles.secondaryButton} onPress={() => setReloadKey((value) => value + 1)}>
          <Text style={styles.secondaryButtonText}>Retry</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={data?.items ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Teams</Text>
            <Text style={styles.subtitle}>Browse the current squads in this closed beta.</Text>
            <View style={styles.noticeCard}>
              <Text style={styles.noticeTitle}>Read-only beta</Text>
              <Text style={styles.info}>{getTeamsNotice(betaAccessState, devRunnerActive, Boolean(data?.supportsMembershipDetails))}</Text>
            </View>
            <View style={styles.noticeCard}>
              <Text style={styles.noticeTitle}>Available now</Text>
              <Text style={styles.info}>Browse squad names, season presence, and any membership details already visible to your account.</Text>
            </View>
            <View style={styles.noticeCard}>
              <Text style={styles.noticeTitle}>Later in beta</Text>
              <Text style={styles.info}>Join and create team actions stay disabled until the full workflow is ready.</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No teams yet</Text>
            <Text style={styles.info}>More squads will appear here as the closed beta roster expands.</Text>
          </View>
        }
        renderItem={({ item }) => <TeamCard item={item} supportsMembershipDetails={Boolean(data?.supportsMembershipDetails)} />}
      />
    </SafeAreaView>
  );
}

function getTeamsNotice(betaAccessState: BetaAccessState, devRunnerActive: boolean, supportsMembershipDetails: boolean) {
  if (betaAccessState === 'dev_runner' || devRunnerActive) {
    return 'DEV runner keeps events and runs testable, but teams stay browse-only and account-based in this beta.';
  }

  if (supportsMembershipDetails) {
    return 'Your account can see current membership details where available. Team joining and creation still open later.';
  }

  if (betaAccessState === 'signed_out') {
    return 'Sign in to see your memberships and member counts. Team joining and creation still open later.';
  }

  return 'Teams are browse-only for now. Joining and creation will open in a later beta update.';
}

function TeamCard({ item, supportsMembershipDetails }: { item: TeamListItem; supportsMembershipDetails: boolean }) {
  return (
    <View style={[styles.card, item.isCurrentUserMember && styles.cardHighlighted]}>
      <View style={styles.cardHeader}>
        <View style={styles.teamIdentity}>
          <View style={styles.teamBadge}>
            <Text style={styles.teamBadgeText}>{item.name.slice(0, 1).toUpperCase()}</Text>
          </View>
          <Text style={styles.cardTitle}>{item.name}</Text>
        </View>
        {item.isCurrentUserMember ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Your team</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.cardDescription}>Browse-only beta team. Season rankings continue on the leaderboard.</Text>
      <Text style={styles.cardMeta}>Created {formatDate(item.createdAt)}</Text>
      <Text style={styles.cardMeta}>
        {supportsMembershipDetails && item.memberCount !== null
          ? `${item.memberCount} member${item.memberCount === 1 ? '' : 's'}`
          : 'Member counts appear after sign-in'}
      </Text>
    </View>
  );
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString();
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
    gap: 12,
    padding: 24,
    backgroundColor: '#f8fafc',
  },
  list: {
    padding: 16,
    gap: 12,
  },
  header: {
    gap: 10,
    marginBottom: 6,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    color: '#475569',
    lineHeight: 20,
  },
  noticeCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 16,
    gap: 6,
  },
  noticeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 16,
    gap: 8,
  },
  cardHighlighted: {
    borderColor: '#0f172a',
    backgroundColor: '#f1f5f9',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  teamIdentity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  teamBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamBadgeText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  cardDescription: {
    color: '#475569',
    lineHeight: 20,
  },
  cardMeta: {
    color: '#64748b',
  },
  badge: {
    borderRadius: 999,
    backgroundColor: '#dbeafe',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 16,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  info: {
    color: '#475569',
    textAlign: 'center',
  },
  error: {
    color: '#b91c1c',
    textAlign: 'center',
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
    fontWeight: '700',
    fontSize: 16,
  },
});
