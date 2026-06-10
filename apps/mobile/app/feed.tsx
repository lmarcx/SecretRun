import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ActionBar } from '@/components/ui/ActionBar';
import { AppScreen } from '@/components/ui/AppScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ProfileMenuButton } from '@/components/ui/ProfileMenuButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { useBottomContentPadding } from '@/hooks/useBottomContentPadding';
import { useAuth } from '@/hooks/useAuth';
import type { FeedActivityItem, FeedData } from '@/services/feedService';
import { fetchFeed, getFeedErrorMessage } from '@/services/feedService';
import type { LeaderboardData } from '@/services/leaderboardService';
import { fetchLeaderboard } from '@/services/leaderboardService';
import { nhost } from '@/services/nhostClient';
import type { CurrentProfile, CurrentProfileStats } from '@/services/profileService';
import { fetchCurrentProfile, fetchCurrentProfileStats } from '@/services/profileService';
import { colors, fonts, spacing, typography } from '@/theme/tokens';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
type FeedFilter = 'all' | 'me' | 'team' | 'buddy' | 'event';
type FeedTone = 'me' | 'team' | 'buddy' | 'event' | 'achievement';

interface FeedIdentity {
  label: string;
  secondaryLabel: string;
  avatarUrl: string | null;
}

interface ViewFeedItem extends FeedActivityItem {
  source: FeedFilter;
  tone: FeedTone;
}

const FEED_FILTERS: Array<{ key: FeedFilter; label: string; icon: IoniconName }> = [
  { key: 'all', label: 'All', icon: 'list-outline' },
  { key: 'me', label: 'Mine', icon: 'person-outline' },
  { key: 'team', label: 'Team', icon: 'people-outline' },
  { key: 'buddy', label: 'Following', icon: 'heart-outline' },
  { key: 'event', label: 'Events', icon: 'trophy-outline' },
];

export default function FeedScreen() {
  const router = useRouter();
  const { isAvailable, loading: authLoading, signOut } = useAuth();
  const currentUser = nhost.auth.getUser();
  const userId = currentUser?.id ?? null;
  const isSignedIn = Boolean(userId);
  const bottomContentPadding = useBottomContentPadding();
  const [data, setData] = useState<FeedData | null>(null);
  const [, setProfile] = useState<CurrentProfile | null>(null);
  const [profileStats, setProfileStats] = useState<CurrentProfileStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [menuIdentity, setMenuIdentity] = useState<FeedIdentity>({
    label: 'Guest',
    secondaryLabel: 'Private feed',
    avatarUrl: null,
  });
  const [activeFilter, setActiveFilter] = useState<FeedFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [signOutLoading, setSignOutLoading] = useState(false);
  const [localReactions, setLocalReactions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      const [feedResult, profileResult, profileStatsResult, leaderboardResult] = await Promise.allSettled([
        fetchFeed(),
        fetchCurrentProfile(),
        fetchCurrentProfileStats(),
        fetchLeaderboard(),
      ]);
      if (!active) return;

      if (feedResult.status === 'rejected') {
        setError(getFeedErrorMessage(feedResult.reason));
        setLoading(false);
        return;
      }

      setData(feedResult.value);
      setProfile(profileResult.status === 'fulfilled' ? profileResult.value : null);
      setProfileStats(profileStatsResult.status === 'fulfilled' ? profileStatsResult.value : null);
      setLeaderboard(leaderboardResult.status === 'fulfilled' ? leaderboardResult.value : null);

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
    if (!userId) return;

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

  const viewItems = useMemo<ViewFeedItem[]>(() => {
    const items = data?.requiresAuth ? [] : data?.items ?? [];
    return items.map((item) => ({
      ...item,
      source: getItemSource(item),
      tone: getItemTone(item),
    }));
  }, [data]);

  const filteredItems = useMemo(() => {
    if (activeFilter === 'all') return viewItems;
    return viewItems.filter((item) => item.source === activeFilter);
  }, [activeFilter, viewItems]);

  const groupedItems = useMemo(() => groupFeedByDate(filteredItems), [filteredItems]);
  const currentUserStanding = leaderboard?.users.find((entry) => entry.id === userId) ?? null;
  const xp = getXpSummary(currentUserStanding?.points ?? 0, profileStats?.validatedRuns ?? 0);
  const initials = getInitials(menuIdentity.label);
  const seasonName = leaderboard?.seasonName ?? 'Private season';

  if (authLoading || loading) {
    return (
      <AppScreen scrollable={false} contentContainerStyle={styles.centered} style={styles.screen}>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={styles.info}>Loading feed...</Text>
      </AppScreen>
    );
  }

  if (error) {
    return (
      <AppScreen scrollable={false} contentContainerStyle={styles.centered} style={styles.screen}>
        <Text style={styles.stateTitle}>Feed</Text>
        <Text style={styles.error}>{error}</Text>
        <SecondaryButton label="Retry" onPress={() => setReloadKey((value) => value + 1)} style={styles.stateButton} />
      </AppScreen>
    );
  }

  return (
    <AppScreen scrollable={false} contentContainerStyle={styles.screen}>
      <ScrollView
        bounces={false}
        contentContainerStyle={[styles.content, { paddingBottom: bottomContentPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Feed</Text>
            <Text style={styles.headerSub}>{seasonName} - {viewItems.length} new activities</Text>
          </View>
          <View style={styles.headerRight}>
            <Pressable accessibilityRole="button" onPress={() => router.push('/settings')} style={styles.notifButton}>
              <Ionicons name="notifications-outline" size={16} color="rgba(255,255,255,0.55)" />
              {isSignedIn ? <View style={styles.notifDot} /> : null}
            </Pressable>
            <View style={styles.profileButtonWrap}>
              <LinearGradient colors={['#8250FF', '#5F30CC']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.profileBackdrop}>
                <Text style={styles.profileInitials}>{initials}</Text>
              </LinearGradient>
              <View style={styles.profileMenuOverlay}>
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
              </View>
            </View>
          </View>
        </View>

        <View style={styles.xpBanner}>
          <View style={styles.xpTop}>
            <View style={styles.xpInfo}>
              <Text style={styles.xpLevel}>Lv. {xp.level}</Text>
              <Text style={styles.xpLabel}>Runner</Text>
            </View>
            <View style={styles.streakBadge}>
              <Ionicons name="flame" size={14} color="#F0C84E" />
              <Text style={styles.streakText}>{xp.validatedRuns} validated runs</Text>
            </View>
          </View>
          <View style={styles.xpTrack}>
            <LinearGradient colors={['#8250FF', '#B38BFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.xpFill, { width: `${xp.progress}%` }]} />
          </View>
          <View style={styles.xpBottom}>
            <Text style={styles.xpBottomText}><Text style={styles.xpBottomStrong}>{xp.current}</Text> / {xp.target} XP</Text>
            <Text style={styles.xpBottomText}><Text style={styles.xpBottomStrong}>{xp.remaining} XP</Text> to next level</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterTabs}>
          {FEED_FILTERS.map((filter) => {
            const active = activeFilter === filter.key;
            return (
              <Pressable
                key={filter.key}
                accessibilityRole="button"
                onPress={() => setActiveFilter(filter.key)}
                style={[styles.filterTab, active ? styles.filterTabOn : styles.filterTabOff]}
              >
                <Ionicons name={filter.icon} size={12} color={active ? '#C4A3FF' : 'rgba(255,255,255,0.35)'} />
                <Text style={[styles.filterLabel, active ? styles.filterLabelOn : styles.filterLabelOff]}>{filter.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {actionError ? <View style={styles.inlineError}><Text style={styles.inlineErrorText}>{actionError}</Text></View> : null}

        {data?.requiresAuth ? (
          <PrivateFeedEmpty isAvailable={isAvailable} router={router} />
        ) : groupedItems.length > 0 ? (
          groupedItems.map((section) => (
            <View key={section.label}>
              <DateSeparator label={section.label} />
              <View style={styles.feedList}>
                {section.items.map((item) => (
                  <FeedCard
                    key={item.id}
                    currentUserRank={currentUserStanding?.rank ?? null}
                    item={item}
                    liked={Boolean(localReactions[item.id])}
                    onComment={() => handleItemAction(item, router)}
                    onOpen={() => handleItemAction(item, router)}
                    onReact={() => setLocalReactions((value) => ({ ...value, [item.id]: !value[item.id] }))}
                  />
                ))}
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyInline}>
            <EmptyState
              title={activeFilter === 'all' ? 'No activity yet' : 'No activity for this filter'}
              description={activeFilter === 'all' ? 'Your runs and results will appear here.' : 'Switch filters or check back after your next run.'}
            />
          </View>
        )}
      </ScrollView>
    </AppScreen>
  );
}

function PrivateFeedEmpty({ isAvailable, router }: { isAvailable: boolean; router: ReturnType<typeof useRouter> }) {
  return (
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
  );
}

function DateSeparator({ label }: { label: string }) {
  return (
    <View style={styles.dateSep}>
      <Text style={styles.dateSepText}>{label}</Text>
      <View style={styles.dateSepLine} />
    </View>
  );
}

function FeedCard({
  currentUserRank,
  item,
  liked,
  onComment,
  onOpen,
  onReact,
}: {
  currentUserRank: number | null;
  item: ViewFeedItem;
  liked: boolean;
  onComment: () => void;
  onOpen: () => void;
  onReact: () => void;
}) {
  const tone = toneStyles[item.tone];
  const name = getDisplayName(item);
  const meta = getCardMeta(item);
  const stats = getStats(item);
  const hasRunTrace = item.type !== 'joined_event' && stats.length > 0;

  return (
    <Pressable accessibilityRole="button" onPress={onOpen} style={styles.card}>
      <LinearGradient colors={[tone.bar, tone.barEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cardBar} />
      <View style={[styles.cardBody, { backgroundColor: tone.bg, borderColor: tone.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.avatar, { backgroundColor: tone.avatarBg }]}>
            {item.tone === 'event' ? (
              <Ionicons name="calendar-outline" size={17} color={tone.text} />
            ) : (
              <Text style={[styles.avatarText, { color: tone.text }]}>{getInitials(name)}</Text>
            )}
          </View>
          <View style={styles.cardHeaderInfo}>
            <View style={styles.nameRow}>
              <Text numberOfLines={1} style={styles.cardName}>{name}</Text>
              <View style={[styles.sourceTag, { backgroundColor: tone.tagBg }]}>
                <Text style={[styles.sourceTagText, { color: tone.text }]}>{getSourceLabel(item)}</Text>
              </View>
            </View>
            <View style={styles.cardMetaRow}>
              <Ionicons name={getMetaIcon(item)} size={12} color="rgba(255,255,255,0.30)" />
              <Text numberOfLines={1} style={styles.cardMeta}>{meta}</Text>
            </View>
          </View>
          <Text style={styles.cardTime}>{formatRelativeTime(item.createdAt)}</Text>
        </View>

        {hasRunTrace ? <MapTrace color={tone.bar} seed={item.id} /> : null}

        {item.type === 'joined_event' ? (
          <EventFeedBlock item={item} onPress={onOpen} />
        ) : item.type === 'result_available' ? (
          <EventResultBlock currentUserRank={currentUserRank} item={item} stats={stats} />
        ) : stats.length > 0 ? (
          <StatsRow stats={stats} />
        ) : null}

        {item.points != null && item.points > 0 ? (
          <View style={[styles.pointsEarned, { backgroundColor: tone.pointsBg, borderColor: tone.pointsBorder }]}>
            <Ionicons name="star" size={13} color={tone.text} />
            <Text style={[styles.pointsEarnedText, { color: tone.text }]}>
              +{item.points} pts{currentUserRank != null ? ` - Rank #${currentUserRank}` : ''}
            </Text>
          </View>
        ) : null}

        {item.type !== 'joined_event' ? (
          <ReactionsRow
            liked={liked}
            onComment={onComment}
            onReact={onReact}
            tone={item.tone === 'buddy' ? 'buddy' : 'me'}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

function MapTrace({ color, seed }: { color: string; seed: string }) {
  const shape = getTraceShape(seed);

  return (
    <View style={styles.mapTrace}>
      <View style={styles.mapGridLineA} />
      <View style={styles.mapGridLineB} />
      {shape.map((segment, index) => (
        <View
          key={`${seed}-${index}`}
          style={[
            styles.traceSegment,
            {
              left: `${segment.left}%`,
              top: segment.top,
              width: `${segment.width}%`,
              transform: [{ rotate: `${segment.rotate}deg` }],
              backgroundColor: color,
            },
          ]}
        />
      ))}
      <View style={styles.startDot} />
      <View style={styles.endDot} />
    </View>
  );
}

function EventResultBlock({
  currentUserRank,
  item,
  stats,
}: {
  currentUserRank: number | null;
  item: ViewFeedItem;
  stats: Array<{ label: string; value: string }>;
}) {
  return (
    <View style={styles.eventResult}>
      <View style={styles.eventResultName}>
        <Text numberOfLines={1} style={styles.eventResultTitle}>{item.event?.title ?? 'Secret Run'}</Text>
        <View style={[styles.rankChip, currentUserRank === 1 ? styles.rankGold : styles.rankPurple]}>
          <Text style={[styles.rankChipText, currentUserRank === 1 ? styles.rankGoldText : styles.rankPurpleText]}>
            {currentUserRank != null ? `#${currentUserRank} Season` : item.status === 'validated' ? 'Scored' : 'Reviewed'}
          </Text>
        </View>
      </View>
      <StatsRow compact stats={stats.slice(0, 3)} />
    </View>
  );
}

function EventFeedBlock({ item, onPress }: { item: ViewFeedItem; onPress: () => void }) {
  return (
    <View style={styles.eventFeedBlock}>
      <View style={styles.eventFeedName}>
        <Text numberOfLines={1} style={styles.eventFeedTitle}>{item.event?.title ?? 'Secret Run'}</Text>
        <View style={styles.rankChip}>
          <Text style={styles.rankPurpleText}>{item.status ?? 'joined'}</Text>
        </View>
      </View>
      <View style={styles.eventFeedMeta}>
        <View style={styles.eventFeedMetaItem}>
          <Ionicons name="lock-closed-outline" size={11} color="rgba(255,255,255,0.35)" />
          <Text style={styles.eventFeedMetaText}>Route hidden</Text>
        </View>
        <View style={styles.eventFeedMetaItem}>
          <Ionicons name="calendar-outline" size={11} color="rgba(255,255,255,0.35)" />
          <Text style={styles.eventFeedMetaText}>{formatShortDate(item.createdAt)}</Text>
        </View>
      </View>
      <Pressable accessibilityRole="button" onPress={onPress} style={styles.eventCta}>
        <Text style={styles.eventCtaText}>View event</Text>
      </Pressable>
    </View>
  );
}

function StatsRow({ compact = false, stats }: { compact?: boolean; stats: Array<{ label: string; value: string }> }) {
  if (stats.length === 0) return null;

  return (
    <View style={[styles.statsRow, compact && styles.statsRowCompact]}>
      {stats.map((stat) => (
        <View key={`${stat.label}-${stat.value}`} style={styles.statBox}>
          <Text numberOfLines={1} style={styles.statValue}>{stat.value}</Text>
          <Text numberOfLines={1} style={styles.statLabel}>{stat.label}</Text>
        </View>
      ))}
    </View>
  );
}

function ReactionsRow({
  liked,
  onComment,
  onReact,
  tone,
}: {
  liked: boolean;
  onComment: () => void;
  onReact: () => void;
  tone: 'me' | 'buddy';
}) {
  const activeStyle = tone === 'buddy' ? styles.reactButtonBuddyActive : styles.reactButtonMeActive;
  const activeTextStyle = tone === 'buddy' ? styles.reactButtonBuddyText : styles.reactButtonMeText;

  return (
    <View style={styles.reactions}>
      <View style={styles.reactButtons}>
        <Pressable accessibilityRole="button" onPress={onReact} style={[styles.reactButton, liked && activeStyle]}>
          <Ionicons name="flame-outline" size={14} color={liked ? (tone === 'buddy' ? '#F0C84E' : '#C4A3FF') : 'rgba(255,255,255,0.40)'} />
          <Text style={[styles.reactButtonText, liked && activeTextStyle]}>{liked ? 1 : 0}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onComment} style={styles.reactButton}>
          <Ionicons name="chatbubble-outline" size={14} color="rgba(255,255,255,0.40)" />
          <Text style={styles.reactButtonText}>0</Text>
        </Pressable>
      </View>
      <View style={styles.shareButton}>
        <Ionicons name="share-social-outline" size={15} color="rgba(255,255,255,0.28)" />
        <Text style={styles.shareText}>Share</Text>
      </View>
    </View>
  );
}

function getItemSource(item: FeedActivityItem): FeedFilter {
  if (item.type === 'joined_event') return 'event';
  return 'me';
}

function getItemTone(item: FeedActivityItem): FeedTone {
  if (item.type === 'joined_event') return 'event';
  return 'me';
}

function getCardMeta(item: FeedActivityItem) {
  const eventTitle = item.event?.title ?? 'Secret Run';

  switch (item.type) {
    case 'joined_event':
      return 'Route hidden - Event registration';
    case 'result_available':
      return `Completed ${eventTitle}`;
    case 'completed_run':
    default:
      return 'Completed a secret run';
  }
}

function getMetaIcon(item: FeedActivityItem): IoniconName {
  if (item.type === 'joined_event') return 'lock-closed-outline';
  return 'walk-outline';
}

function getSourceLabel(item: ViewFeedItem) {
  switch (item.source) {
    case 'event':
      return 'Event';
    case 'team':
      return 'Team';
    case 'buddy':
      return 'Following';
    case 'me':
    default:
      return 'Me';
  }
}

function getDisplayName(item: FeedActivityItem) {
  if (item.type === 'joined_event') return 'New event available';
  return item.profile?.displayName ?? item.profile?.username ?? 'You';
}

function getStats(item: FeedActivityItem): Array<{ label: string; value: string }> {
  const stats: Array<{ label: string; value: string }> = [];

  if (item.distanceKm != null) {
    stats.push({ label: 'km', value: item.distanceKm.toFixed(1) });
  }

  if (item.durationSeconds != null) {
    stats.push({ label: 'Time', value: formatDuration(item.durationSeconds) });
  }

  if (item.distanceKm != null && item.durationSeconds != null && item.distanceKm > 0) {
    stats.push({ label: 'Pace /km', value: formatPace(item.durationSeconds / item.distanceKm) });
  } else if (item.avgSpeedKmh != null) {
    stats.push({ label: 'Speed', value: `${item.avgSpeedKmh.toFixed(1)}` });
  }

  return stats;
}

function handleItemAction(item: FeedActivityItem, router: ReturnType<typeof useRouter>) {
  if (item.type === 'result_available') {
    router.push('/leaderboard');
    return;
  }

  const eventId = item.event?.id ?? null;
  if (eventId) {
    router.push({ pathname: '/events/[id]', params: { id: eventId } });
  }
}

function groupFeedByDate(items: ViewFeedItem[]) {
  const groups: Array<{ label: string; items: ViewFeedItem[] }> = [];

  for (const item of items) {
    const label = getDateGroupLabel(item.createdAt);
    const group = groups.find((entry) => entry.label === label);
    if (group) {
      group.items.push(item);
    } else {
      groups.push({ label, items: [item] });
    }
  }

  return groups;
}

function getDateGroupLabel(value: string) {
  const date = new Date(value);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((today - day) / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';

  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });
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

function formatPace(secondsPerKm: number) {
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.round(secondsPerKm % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function formatRelativeTime(value: string) {
  const then = new Date(value).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - then);
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return formatShortDate(value);
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });
}

function getInitials(name: string) {
  const words = name.trim().split(/\s+/);
  const initials = words.slice(0, 2).map((word) => word[0]?.toUpperCase() ?? '').join('');
  return initials || '?';
}

function getXpSummary(points: number, validatedRuns: number) {
  const target = 1000;
  const level = Math.max(1, Math.floor(points / target) + 1);
  const current = points % target;
  const remaining = target - current;
  const progress = Math.min(100, Math.max(4, Math.round((current / target) * 100)));

  return {
    current,
    level,
    progress,
    remaining: remaining === target ? 0 : remaining,
    target,
    validatedRuns,
  };
}

function getTraceShape(seed: string) {
  const offset = seed.split('').reduce((total, char) => total + char.charCodeAt(0), 0) % 9;
  return [
    { left: 6, rotate: -24 + offset, top: 51, width: 20 },
    { left: 24, rotate: 14 - offset, top: 37, width: 23 },
    { left: 45, rotate: -18 + offset, top: 43, width: 22 },
    { left: 64, rotate: 12 - offset, top: 31, width: 24 },
  ];
}

const toneStyles: Record<FeedTone, { avatarBg: string; bar: string; barEnd: string; bg: string; border: string; pointsBg: string; pointsBorder: string; tagBg: string; text: string }> = {
  me: {
    avatarBg: 'rgba(130,80,255,0.22)',
    bar: '#8250FF',
    barEnd: 'rgba(130,80,255,0)',
    bg: 'rgba(130,80,255,0.06)',
    border: 'rgba(130,80,255,0.18)',
    pointsBg: 'rgba(130,80,255,0.14)',
    pointsBorder: 'rgba(130,80,255,0.28)',
    tagBg: 'rgba(130,80,255,0.18)',
    text: '#C4A3FF',
  },
  team: {
    avatarBg: 'rgba(78,204,163,0.20)',
    bar: '#4ECCA3',
    barEnd: 'rgba(78,204,163,0)',
    bg: 'rgba(78,204,163,0.05)',
    border: 'rgba(78,204,163,0.15)',
    pointsBg: 'rgba(78,204,163,0.12)',
    pointsBorder: 'rgba(78,204,163,0.28)',
    tagBg: 'rgba(78,204,163,0.12)',
    text: '#5DDDB8',
  },
  buddy: {
    avatarBg: 'rgba(232,184,75,0.18)',
    bar: '#E8B84B',
    barEnd: 'rgba(232,184,75,0)',
    bg: 'rgba(232,184,75,0.05)',
    border: 'rgba(232,184,75,0.14)',
    pointsBg: 'rgba(232,184,75,0.12)',
    pointsBorder: 'rgba(232,184,75,0.28)',
    tagBg: 'rgba(232,184,75,0.12)',
    text: '#F0C84E',
  },
  event: {
    avatarBg: 'rgba(255,107,83,0.15)',
    bar: '#FF6B53',
    barEnd: 'rgba(255,107,83,0)',
    bg: 'rgba(255,107,83,0.05)',
    border: 'rgba(255,107,83,0.15)',
    pointsBg: 'rgba(255,107,83,0.12)',
    pointsBorder: 'rgba(255,107,83,0.28)',
    tagBg: 'rgba(255,107,83,0.12)',
    text: '#FF9870',
  },
  achievement: {
    avatarBg: 'rgba(250,199,117,0.15)',
    bar: '#FAC775',
    barEnd: 'rgba(250,199,117,0)',
    bg: 'rgba(250,199,117,0.06)',
    border: 'rgba(250,199,117,0.20)',
    pointsBg: 'rgba(250,199,117,0.12)',
    pointsBorder: 'rgba(250,199,117,0.28)',
    tagBg: 'rgba(250,199,117,0.12)',
    text: '#FAC775',
  },
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
    backgroundColor: '#0A0A0F',
  },
  content: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    lineHeight: 24,
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notifButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  notifDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: '#0A0A0F',
    backgroundColor: '#8250FF',
  },
  profileButtonWrap: {
    width: 36,
    height: 36,
  },
  profileBackdrop: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(130,80,255,0.40)',
  },
  profileInitials: {
    fontSize: 13,
    fontFamily: fonts.syne800,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  profileMenuOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.02,
  },
  xpBanner: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(130,80,255,0.25)',
    backgroundColor: '#111018',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  xpTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  xpInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  xpLevel: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(130,80,255,0.40)',
    backgroundColor: 'rgba(130,80,255,0.20)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    fontSize: 11,
    fontFamily: fonts.dmSans600,
    fontWeight: '800',
    color: '#C4A3FF',
  },
  xpLabel: {
    fontSize: 12,
    fontFamily: fonts.dmSans400,
    color: 'rgba(255,255,255,0.40)',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  streakText: {
    fontSize: 12,
    fontFamily: fonts.dmSans600,
    fontWeight: '700',
    color: '#F0C84E',
  },
  xpTrack: {
    height: 5,
    overflow: 'hidden',
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  xpFill: {
    height: '100%',
    borderRadius: 3,
  },
  xpBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  xpBottomText: {
    fontSize: 10,
    fontFamily: fonts.dmSans400,
    color: 'rgba(255,255,255,0.25)',
  },
  xpBottomStrong: {
    fontFamily: fonts.dmSans600,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.50)',
  },
  filterTabs: {
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  filterTab: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 13,
    paddingVertical: 6,
  },
  filterTabOn: {
    backgroundColor: 'rgba(130,80,255,0.20)',
    borderColor: 'rgba(130,80,255,0.35)',
  },
  filterTabOff: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  filterLabel: {
    fontSize: 11,
    fontFamily: fonts.dmSans600,
    fontWeight: '700',
  },
  filterLabelOn: {
    color: '#C4A3FF',
  },
  filterLabelOff: {
    color: 'rgba(255,255,255,0.35)',
  },
  inlineError: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(248,113,113,0.28)',
    backgroundColor: 'rgba(248,113,113,0.10)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inlineErrorText: {
    ...typography.bodySm,
    color: '#FCA5A5',
  },
  dateSep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  dateSepText: {
    fontSize: 10,
    fontFamily: fonts.dmSans600,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.25)',
  },
  dateSepLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  feedList: {
    gap: 10,
    paddingHorizontal: 16,
  },
  card: {
    overflow: 'hidden',
    borderRadius: 16,
  },
  cardBar: {
    height: 2,
  },
  cardBody: {
    borderWidth: StyleSheet.hairlineWidth,
    borderTopWidth: 0,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  avatarText: {
    fontSize: 13,
    fontFamily: fonts.syne800,
    fontWeight: '800',
  },
  cardHeaderInfo: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardName: {
    maxWidth: '68%',
    fontSize: 13,
    fontFamily: fonts.dmSans600,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sourceTag: {
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  sourceTagText: {
    fontSize: 10,
    fontFamily: fonts.dmSans600,
    fontWeight: '700',
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  cardMeta: {
    flex: 1,
    fontSize: 11,
    fontFamily: fonts.dmSans400,
    color: 'rgba(255,255,255,0.30)',
  },
  cardTime: {
    fontSize: 11,
    fontFamily: fonts.dmSans400,
    color: 'rgba(255,255,255,0.20)',
  },
  mapTrace: {
    height: 80,
    overflow: 'hidden',
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: '#141820',
  },
  mapGridLineA: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 24,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  mapGridLineB: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 54,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  traceSegment: {
    position: 'absolute',
    height: 3,
    borderRadius: 2,
    opacity: 0.86,
  },
  startDot: {
    position: 'absolute',
    left: 18,
    top: 58,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ECCA3',
  },
  endDot: {
    position: 'absolute',
    right: 18,
    top: 36,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B53',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  statsRowCompact: {
    marginBottom: 0,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.07)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  statValue: {
    fontSize: 15,
    lineHeight: 17,
    fontFamily: fonts.syne800,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statLabel: {
    marginTop: 2,
    fontSize: 9,
    fontFamily: fonts.dmSans600,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.28)',
  },
  pointsEarned: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pointsEarnedText: {
    fontSize: 12,
    fontFamily: fonts.dmSans600,
    fontWeight: '700',
  },
  reactions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reactButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  reactButton: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  reactButtonText: {
    fontSize: 12,
    fontFamily: fonts.dmSans600,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.40)',
  },
  reactButtonMeActive: {
    borderColor: 'rgba(130,80,255,0.30)',
    backgroundColor: 'rgba(130,80,255,0.14)',
  },
  reactButtonMeText: {
    color: '#C4A3FF',
  },
  reactButtonBuddyActive: {
    borderColor: 'rgba(232,184,75,0.28)',
    backgroundColor: 'rgba(232,184,75,0.12)',
  },
  reactButtonBuddyText: {
    color: '#F0C84E',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  shareText: {
    fontSize: 12,
    fontFamily: fonts.dmSans400,
    color: 'rgba(255,255,255,0.28)',
  },
  eventResult: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.07)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  eventResultName: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  eventResultTitle: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.dmSans600,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  rankChip: {
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(130,80,255,0.30)',
    backgroundColor: 'rgba(130,80,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  rankChipText: {
    fontSize: 11,
    fontFamily: fonts.dmSans600,
    fontWeight: '800',
  },
  rankGold: {
    borderColor: 'rgba(232,184,75,0.30)',
    backgroundColor: 'rgba(232,184,75,0.15)',
  },
  rankPurple: {
    borderColor: 'rgba(130,80,255,0.30)',
    backgroundColor: 'rgba(130,80,255,0.15)',
  },
  rankGoldText: {
    color: '#F0C84E',
  },
  rankPurpleText: {
    fontSize: 11,
    fontFamily: fonts.dmSans600,
    fontWeight: '800',
    color: '#B38BFF',
  },
  eventFeedBlock: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,107,83,0.15)',
    backgroundColor: 'rgba(255,107,83,0.05)',
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  eventFeedName: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 5,
  },
  eventFeedTitle: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.dmSans600,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  eventFeedMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  eventFeedMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventFeedMetaText: {
    fontSize: 11,
    fontFamily: fonts.dmSans400,
    color: 'rgba(255,255,255,0.35)',
  },
  eventCta: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,107,83,0.28)',
    backgroundColor: 'rgba(255,107,83,0.14)',
    paddingVertical: 9,
  },
  eventCtaText: {
    fontSize: 13,
    fontFamily: fonts.dmSans600,
    fontWeight: '700',
    color: '#FF9870',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: 16,
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
  emptyInline: {
    paddingHorizontal: 16,
    paddingTop: spacing.xl,
  },
});
