import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { FeedActivityItem, FeedData } from '@/services/feedService';
import { fetchFeed, getFeedErrorMessage } from '@/services/feedService';

export default function FeedScreen() {
  const router = useRouter();
  const [data, setData] = useState<FeedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const nextData = await fetchFeed();
        if (!active) {
          return;
        }

        setData(nextData);
      } catch (err) {
        if (!active) {
          return;
        }

        setError(getFeedErrorMessage(err));
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
        <Text style={styles.info}>Loading activity feed...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.title}>Feed</Text>
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
            <Text style={styles.title}>Feed</Text>
            <Text style={styles.subtitle}>Recent activity backed by the current activity model.</Text>
            {data?.message ? (
              <View style={styles.noticeCard}>
                <Text style={styles.noticeText}>{data.message}</Text>
              </View>
            ) : null}
            {data?.requiresAuth ? (
              <Pressable style={styles.secondaryButton} onPress={() => router.push('/profile')}>
                <Text style={styles.secondaryButtonText}>Open profile</Text>
              </Pressable>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.info}>
              {data?.requiresAuth ? 'Sign in to load your backend activity feed.' : 'No backend activities are available yet.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => <FeedCard item={item} />}
      />
    </SafeAreaView>
  );
}

function FeedCard({ item }: { item: FeedActivityItem }) {
  const name = item.profile?.displayName ?? item.profile?.username ?? 'Runner';
  const secondary = item.profile?.username ? `@${item.profile.username}` : item.event?.title ?? 'Secret Run activity';

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Avatar avatarUrl={item.profile?.avatarUrl ?? null} label={name} />
        <View style={styles.identity}>
          <Text style={styles.cardTitle}>{name}</Text>
          <Text style={styles.cardMeta}>{secondary}</Text>
        </View>
        <Text style={styles.cardDate}>{formatDateTime(item.createdAt)}</Text>
      </View>
      <View style={styles.metricsRow}>
        <Metric label="Status" value={formatStatus(item.status)} />
        <Metric label="Distance" value={`${item.distanceKm.toFixed(3)} km`} />
        <Metric label="Duration" value={formatDuration(item.durationSeconds)} />
      </View>
      <Text style={styles.cardMeta}>
        Points: {item.points} {item.status === 'pending' ? '· leaderboard update pending validation' : ''}
      </Text>
    </View>
  );
}

function Avatar({ avatarUrl, label }: { avatarUrl: string | null; label: string }) {
  if (avatarUrl) {
    return <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />;
  }

  return (
    <View style={styles.avatarFallback}>
      <Text style={styles.avatarFallbackText}>{label.slice(0, 1).toUpperCase()}</Text>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function formatStatus(value: string): string {
  switch (value) {
    case 'pending':
      return 'Pending';
    case 'validated':
      return 'Validated';
    case 'rejected':
      return 'Rejected';
    default:
      return value;
  }
}

function formatDuration(durationSeconds: number): string {
  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);
  const seconds = durationSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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
    backgroundColor: '#f8fafc',
    gap: 12,
    padding: 24,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  header: {
    gap: 10,
    marginBottom: 8,
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
  },
  noticeText: {
    color: '#475569',
    lineHeight: 20,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 16,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  identity: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  cardMeta: {
    color: '#64748b',
  },
  cardDate: {
    color: '#64748b',
    fontSize: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metric: {
    flex: 1,
    gap: 4,
  },
  metricLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metricValue: {
    color: '#0f172a',
    fontWeight: '700',
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
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
  empty: {
    paddingVertical: 32,
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
