import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { ActionBar } from '@/components/ui/ActionBar';
import { ActivityCard, type ActivityCardStat } from '@/components/ui/ActivityCard';
import { AppScreen } from '@/components/ui/AppScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ProfileMenuButton } from '@/components/ui/ProfileMenuButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { useBottomContentPadding } from '@/hooks/useBottomContentPadding';
import { useAuth } from '@/hooks/useAuth';
import type { FeedActivityItem, FeedData } from '@/services/feedService';
import { fetchFeed, getFeedErrorMessage } from '@/services/feedService';
import { nhost } from '@/services/nhostClient';
import { fetchCurrentProfile } from '@/services/profileService';
import { colors, spacing, typography } from '@/theme/tokens';

interface FeedIdentity {
  label: string;
  secondaryLabel: string;
  avatarUrl: string | null;
}

export default function FeedScreen() {
  const router = useRouter();
  const { isAvailable, loading: authLoading, signOut } = useAuth();
  const currentUser = nhost.auth.getUser();
  const userId = currentUser?.id ?? null;
  const isSignedIn = Boolean(userId);
  const bottomContentPadding = useBottomContentPadding();
  const [data, setData] = useState<FeedData | null>(null);
  const [menuIdentity, setMenuIdentity] = useState<FeedIdentity>({
    label: 'Guest',
    secondaryLabel: 'Private feed',
    avatarUrl: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [signOutLoading, setSignOutLoading] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      const [feedResult, profileResult] = await Promise.allSettled([fetchFeed(), fetchCurrentProfile()]);
      if (!active) {
        return;
      }

      if (feedResult.status === 'rejected') {
        setError(getFeedErrorMessage(feedResult.reason));
        setLoading(false);
        return;
      }

      setData(feedResult.value);

      const fallbackLabel =
        currentUser?.displayName?.trim() || currentUser?.email?.split('@')[0] || (userId ? 'Runner' : 'Guest');
      const fallbackSecondary = userId ? currentUser?.email ?? 'Beta account' : 'Private feed';
      const currentProfile = profileResult.status === 'fulfilled' ? profileResult.value : null;

      setMenuIdentity({
        label: currentProfile?.displayName ?? fallbackLabel,
        secondaryLabel: currentProfile?.username ? `@${currentProfile.username}` : fallbackSecondary,
        avatarUrl: currentProfile?.avatarUrl ?? null,
      });
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [currentUser?.displayName, currentUser?.email, reloadKey, userId]);

  const handleSignOut = async () => {
    if (!userId) {
      return;
    }

    setSignOutLoading(true);
    setActionError(null);

    try {
      await signOut();
      setReloadKey((value) => value + 1);
    } catch {
      setActionError('We could not sign out right now.');
    } finally {
      setSignOutLoading(false);
    }
  };

  const listHeader = useMemo(
    () => (
      <View style={styles.header}>
        <ScreenHeader
          accessory={
            <ProfileMenuButton
              authenticated={isSignedIn}
              avatarUrl={menuIdentity.avatarUrl}
              label={menuIdentity.label}
              onLogin={() => router.push({ pathname: '/(auth)/login', params: { redirectTo: '/feed' } })}
              onProfile={() => router.push('/profile')}
              onSettings={() => router.push('/settings')}
              onSignOut={() => void handleSignOut()}
              secondaryLabel={menuIdentity.secondaryLabel}
              signOutDisabled={!userId || signOutLoading}
              signOutLabel={signOutLoading ? 'Signing out...' : 'Sign out'}
            />
          }
          title="Feed"
          subtitle="Private activity and result updates."
        />

        {actionError ? <EmptyState title={actionError} /> : null}
      </View>
    ),
    [actionError, isSignedIn, menuIdentity, router, signOutLoading, userId],
  );

  if (authLoading || loading) {
    return (
      <AppScreen scrollable={false} contentContainerStyle={styles.centered}>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={styles.info}>Loading feed...</Text>
      </AppScreen>
    );
  }

  if (error) {
    return (
      <AppScreen scrollable={false} contentContainerStyle={styles.centered}>
        <Text style={styles.title}>Feed</Text>
        <Text style={styles.error}>{error}</Text>
        <SecondaryButton label="Retry" onPress={() => setReloadKey((value) => value + 1)} style={styles.stateButton} />
      </AppScreen>
    );
  }

  return (
    <AppScreen scrollable={false} contentContainerStyle={styles.screen}>
      <FlatList
        data={data?.requiresAuth ? [] : data?.items ?? []}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={[styles.listContent, { paddingBottom: bottomContentPadding }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={listHeader}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          data?.requiresAuth ? (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyStateCard}>
                <EmptyState
                  title="Your activity feed is private"
                  description="Sign in or create an account to see your runs, results, and event activity."
                />
              </View>
              {isAvailable ? (
                <View style={styles.emptyStateActions}>
                  <ActionBar
                    secondary={
                      <SecondaryButton
                        label="Create account"
                        onPress={() => router.push({ pathname: '/(auth)/register', params: { redirectTo: '/feed' } })}
                      />
                    }
                    primary={
                      <PrimaryButton
                        label="Sign in"
                        onPress={() => router.push({ pathname: '/(auth)/login', params: { redirectTo: '/feed' } })}
                      />
                    }
                  />
                </View>
              ) : null}
            </View>
          ) : (
            <EmptyState title="No activity yet" description="Your runs and results will appear here." />
          )
        }
        renderItem={({ item }) => (
          <ActivityCard
            actionLabel={getItemActionLabel(item)}
            actionLine={getActionLine(item)}
            avatarUrl={item.profile?.avatarUrl ?? null}
            onAction={getItemAction(item, router)}
            stats={getStats(item)}
            supportLine={getSupportLine(item)}
            timestamp={formatTimestamp(item.createdAt)}
            username={item.profile?.username ?? item.profile?.displayName ?? 'runner'}
          />
        )}
      />
    </AppScreen>
  );
}

function getActionLine(item: FeedActivityItem) {
  const eventTitle = item.event?.title ?? 'Secret Run';

  switch (item.type) {
    case 'joined_event':
      return `Joined ${eventTitle}`;
    case 'result_available':
      return `Result available for ${eventTitle}`;
    case 'completed_run':
    default:
      return `Completed ${eventTitle}`;
  }
}

function getSupportLine(item: FeedActivityItem) {
  if (item.type === 'result_available') {
    if (item.status === 'rejected') {
      return 'Review finished. This run did not score.';
    }

    return `Season score updated with ${item.points ?? 0} points.`;
  }

  if (item.type === 'completed_run') {
    return 'Run submitted for review.';
  }

  return undefined;
}

function getStats(item: FeedActivityItem): ActivityCardStat[] | undefined {
  if (item.type === 'joined_event') {
    return undefined;
  }

  const stats: ActivityCardStat[] = [];

  if (item.durationSeconds != null) {
    stats.push({ label: 'Time', value: formatDuration(item.durationSeconds), tone: 'accent' });
  }

  if (item.distanceKm != null) {
    stats.push({ label: 'Dist', value: `${item.distanceKm.toFixed(2)} km`, tone: 'info' });
  }

  if (item.avgSpeedKmh != null) {
    stats.push({ label: 'Speed', value: `${item.avgSpeedKmh.toFixed(1)} km/h`, tone: 'success' });
  }

  return stats.length > 0 ? stats : undefined;
}

function getItemActionLabel(item: FeedActivityItem) {
  switch (item.type) {
    case 'joined_event':
      return item.event ? 'View' : undefined;
    case 'result_available':
      return 'Open result';
    case 'completed_run':
    default:
      return item.event ? 'Open run' : undefined;
  }
}

function getItemAction(item: FeedActivityItem, router: ReturnType<typeof useRouter>) {
  if (item.type === 'result_available') {
    return () => router.push('/leaderboard');
  }

  const eventId = item.event?.id ?? null;
  if (eventId) {
    return () => router.push({ pathname: '/events/[id]', params: { id: eventId } });
  }

  return undefined;
}

function formatDuration(durationSeconds: number) {
  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);
  const seconds = durationSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  list: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
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
  separator: {
    height: spacing.sm,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingTop: spacing.xl,
  },
  emptyStateCard: {
    width: '100%',
    maxWidth: 360,
  },
  emptyStateActions: {
    width: '100%',
    maxWidth: 360,
  },
});
