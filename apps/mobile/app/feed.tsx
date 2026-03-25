import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { ActionBar } from '@/components/ui/ActionBar';
import { AppScreen } from '@/components/ui/AppScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { LeaderboardAvatar } from '@/components/ui/LeaderboardAvatar';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ProfileMenuButton } from '@/components/ui/ProfileMenuButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { SectionCard } from '@/components/ui/SectionCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useBottomContentPadding } from '@/hooks/useBottomContentPadding';
import { useAuth, type BetaAccessState } from '@/hooks/useAuth';
import type { FeedActivityItem, FeedData } from '@/services/feedService';
import { fetchFeed, getFeedErrorMessage } from '@/services/feedService';
import { nhost } from '@/services/nhostClient';
import { fetchCurrentProfile } from '@/services/profileService';
import { borderWidth, colors, radius, spacing, typography } from '@/theme/tokens';

interface FeedIdentity {
  label: string;
  secondaryLabel: string;
  avatarUrl: string | null;
}

export default function FeedScreen() {
  const router = useRouter();
  const { betaAccessState, isAvailable, loading: authLoading, signOut } = useAuth();
  const currentUser = nhost.auth.getUser();
  const userId = currentUser?.id ?? null;
  const bottomContentPadding = useBottomContentPadding();
  const [data, setData] = useState<FeedData | null>(null);
  const [menuIdentity, setMenuIdentity] = useState<FeedIdentity>({
    label: 'Guest',
    secondaryLabel: 'Browse only',
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
      const fallbackSecondary = userId ? currentUser?.email ?? 'Beta account' : 'Browse only';
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
              avatarUrl={menuIdentity.avatarUrl}
              label={menuIdentity.label}
              onProfile={() => router.push('/profile')}
              onSettings={() => router.push('/settings')}
              onSignOut={() => void handleSignOut()}
              secondaryLabel={menuIdentity.secondaryLabel}
              signOutDisabled={!userId || signOutLoading}
              signOutLabel={signOutLoading ? 'Signing out...' : 'Sign out'}
            />
          }
          title="Feed"
          subtitle={getFeedSubtitle(data?.requiresAuth ?? !userId)}
        />

        {actionError ? <EmptyState title={actionError} /> : null}

        {data?.message ? (
          <SectionCard tone="muted">
            <Text style={styles.supportText}>{data.message}</Text>
          </SectionCard>
        ) : null}

        {data?.requiresAuth ? (
          <SectionCard tone="accent" title="Private feed" subtitle={getFeedLockedMessage(betaAccessState, isAvailable)}>
            <ActionBar
              primary={isAvailable ? <PrimaryButton label="Sign in" onPress={() => router.push('/(auth)/login')} /> : undefined}
              secondary={<SecondaryButton label="Events" onPress={() => router.push('/events')} />}
            />
          </SectionCard>
        ) : null}
      </View>
    ),
    [actionError, betaAccessState, data?.message, data?.requiresAuth, isAvailable, menuIdentity, router, signOutLoading, userId],
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
          <EmptyState
            title={data?.requiresAuth ? 'Feed locked' : 'No activity yet'}
            description={
              data?.requiresAuth
                ? getFeedLockedMessage(betaAccessState, isAvailable)
                : 'Validated runs, review updates, and result drops land here.'
            }
          />
        }
        renderItem={({ item }) => <FeedCard item={item} />}
      />
    </AppScreen>
  );
}

function FeedCard({ item }: { item: FeedActivityItem }) {
  const name = item.profile?.displayName ?? item.profile?.username ?? 'Runner';
  const handle = item.profile?.username ? `@${item.profile.username}` : 'Secret Run';
  const badge = getStatusBadge(item.status);
  const eventLabel = item.event?.title ?? 'Secret Run activity';

  return (
    <SectionCard accessory={<StatusBadge compact label={badge.label} tone={badge.tone} />}>
      <View style={styles.cardHeader}>
        <View style={styles.identity}>
          <LeaderboardAvatar avatarUrl={item.profile?.avatarUrl} label={name} size="sm" />
          <View style={styles.identityCopy}>
            <Text numberOfLines={1} style={styles.cardTitle}>
              {name}
            </Text>
            <Text numberOfLines={1} style={styles.cardSubtitle}>
              {handle}
            </Text>
          </View>
        </View>
        <Text style={styles.cardDate}>{formatDateTime(item.createdAt)}</Text>
      </View>

      <View style={styles.activityBlock}>
        <Text style={styles.activityLine}>{getActivityHeadline(item.status)}</Text>
        <Text numberOfLines={1} style={styles.activityMeta}>
          {eventLabel}
        </Text>
      </View>

      <View style={styles.metaRow}>
        <Metric label="Distance" value={`${item.distanceKm.toFixed(2)} km`} />
        <Metric label="Duration" value={formatDuration(item.durationSeconds)} />
        <Metric label="Points" value={`${item.points}`} />
      </View>

      <Text style={styles.supportText}>{getActivitySupportLine(item)}</Text>
    </SectionCard>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.metricValue}>
        {value}
      </Text>
    </View>
  );
}

function getFeedSubtitle(requiresAuth: boolean) {
  return requiresAuth ? 'Private activity and result updates.' : 'Run updates, review state, and results.';
}

function getFeedLockedMessage(betaAccessState: BetaAccessState, isAvailable: boolean) {
  if (betaAccessState === 'dev_runner') {
    return 'Local run testing stays open, but this feed still needs a signed-in beta account.';
  }

  if (!isAvailable || betaAccessState === 'auth_unavailable') {
    return 'This environment is still guest-only, so the private feed stays locked.';
  }

  return 'Sign in to unlock your personal run activity and result updates.';
}

function getActivityHeadline(status: string) {
  switch (status) {
    case 'validated':
      return 'Result available';
    case 'rejected':
      return 'Run reviewed';
    case 'pending':
    default:
      return 'Completed run';
  }
}

function getActivitySupportLine(item: FeedActivityItem) {
  switch (item.status) {
    case 'validated':
      return `Leaderboard updated with ${item.points} points.`;
    case 'rejected':
      return 'This run did not pass review.';
    case 'pending':
    default:
      return 'Leaderboard update pending review.';
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'validated':
      return {
        label: 'Scored',
        tone: 'success' as const,
      };
    case 'rejected':
      return {
        label: 'Rejected',
        tone: 'danger' as const,
      };
    case 'pending':
    default:
      return {
        label: 'Review',
        tone: 'warning' as const,
      };
  }
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

function formatDateTime(value: string) {
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  identity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  identityCopy: {
    flex: 1,
    gap: spacing.xxs,
  },
  cardTitle: {
    ...typography.body,
    color: colors.textPrimary,
  },
  cardSubtitle: {
    ...typography.bodySm,
    color: colors.textMuted,
  },
  cardDate: {
    ...typography.bodySm,
    color: colors.textMuted,
  },
  activityBlock: {
    gap: spacing.xxs,
  },
  activityLine: {
    ...typography.cardTitle,
    color: colors.textPrimary,
  },
  activityMeta: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: borderWidth.regular,
    borderColor: colors.border,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  metric: {
    flex: 1,
    gap: spacing.xxs,
  },
  metricLabel: {
    ...typography.eyebrow,
    color: colors.textMuted,
  },
  metricValue: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  supportText: {
    ...typography.bodySm,
    color: colors.textMuted,
  },
});
