import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Image, Linking, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionBar } from '@/components/ui/ActionBar';
import { ActionRow } from '@/components/ui/ActionRow';
import { AppScreen } from '@/components/ui/AppScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { InfoRow } from '@/components/ui/InfoRow';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { SectionCard } from '@/components/ui/SectionCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatCard } from '@/components/ui/StatCard';
import { useBottomContentPadding } from '@/hooks/useBottomContentPadding';
import { useAuth } from '@/hooks/useAuth';
import {
  buildBetaIssueMailto,
  formatBetaTimestamp,
  formatValidationReason,
  getBetaBuildLabel,
  useBetaDiagnostics,
} from '@/services/betaDiagnostics';
import { fetchLeaderboard } from '@/services/leaderboardService';
import { nhost } from '@/services/nhostClient';
import {
  enablePushNotifications,
  getNotificationRegistrationState,
  type NotificationRegistrationState,
} from '@/services/notificationsService';
import type { CurrentProfile } from '@/services/profileService';
import {
  createCurrentProfile,
  fetchCurrentProfile,
  fetchCurrentProfileStats,
  getProfileErrorMessage,
} from '@/services/profileService';
import { fetchTeams } from '@/services/teamsService';
import { borderWidth, colors, radius, spacing, typography } from '@/theme/tokens';

interface ProfileOverview {
  validatedRuns: number;
  seasonPoints: number;
  seasonRank: number | null;
  seasonName: string | null;
  teamName: string | null;
  teamId: string | null;
}

const emptyOverview: ProfileOverview = {
  validatedRuns: 0,
  seasonPoints: 0,
  seasonRank: null,
  seasonName: null,
  teamName: null,
  teamId: null,
};

export default function ProfileScreen() {
  const router = useRouter();
  const { betaAccessState, disabledMessage, isAvailable, loading: authLoading, signOut } = useAuth();
  const currentUser = nhost.auth.getUser();
  const userId = currentUser?.id ?? null;
  const bottomContentPadding = useBottomContentPadding();
  const diagnostics = useBetaDiagnostics();
  const [profile, setProfile] = useState<CurrentProfile | null>(null);
  const [overview, setOverview] = useState<ProfileOverview>(emptyOverview);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [notificationState, setNotificationState] = useState<NotificationRegistrationState | null>(null);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsSubmitting, setNotificationsSubmitting] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState('');
  const [displayNameDraft, setDisplayNameDraft] = useState('');
  const [profileSubmitting, setProfileSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    if (!userId) {
      setProfile(null);
      setOverview(emptyOverview);
      setLoadError(null);
      setFormError(null);
      setActionError(null);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      const [profileResult, statsResult, leaderboardResult, teamsResult] = await Promise.allSettled([
        fetchCurrentProfile(),
        fetchCurrentProfileStats(),
        fetchLeaderboard(),
        fetchTeams(),
      ]);

      if (!active) {
        return;
      }

      if (profileResult.status === 'rejected') {
        setProfile(null);
        setOverview(emptyOverview);
        setLoadError(getProfileErrorMessage(profileResult.reason));
        setLoading(false);
        return;
      }

      const leaderboardData = leaderboardResult.status === 'fulfilled' ? leaderboardResult.value : null;
      const teamsData = teamsResult.status === 'fulfilled' ? teamsResult.value : null;
      const currentTeam = teamsData?.items.find((item) => item.isCurrentUserMember) ?? null;
      const currentStanding = leaderboardData?.users.find((entry) => entry.id === userId) ?? null;

      setProfile(profileResult.value);
      setOverview({
        validatedRuns: statsResult.status === 'fulfilled' ? statsResult.value.validatedRuns : 0,
        seasonPoints: currentStanding?.points ?? 0,
        seasonRank: currentStanding?.rank ?? null,
        seasonName: leaderboardData?.seasonName ?? null,
        teamName: currentTeam?.name ?? null,
        teamId: currentTeam?.id ?? null,
      });
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [reloadKey, userId]);

  useEffect(() => {
    if (!userId) {
      setUsernameDraft('');
      setDisplayNameDraft('');
      return;
    }

    const suggestedDisplayName = currentUser?.displayName?.trim() || currentUser?.email?.split('@')[0] || '';
    const suggestedUsername = sanitizeUsername(currentUser?.displayName ?? currentUser?.email?.split('@')[0] ?? '');

    setDisplayNameDraft((value) => value || suggestedDisplayName);
    setUsernameDraft((value) => value || suggestedUsername);
  }, [currentUser?.displayName, currentUser?.email, userId]);

  useEffect(() => {
    let active = true;

    if (!userId) {
      setNotificationState(null);
      setNotificationsLoading(false);
      return () => {
        active = false;
      };
    }

    const loadNotificationState = async () => {
      setNotificationsLoading(true);

      try {
        const nextState = await getNotificationRegistrationState();
        if (!active) {
          return;
        }

        setNotificationState(nextState);
      } finally {
        if (active) {
          setNotificationsLoading(false);
        }
      }
    };

    void loadNotificationState();

    return () => {
      active = false;
    };
  }, [userId]);

  const handleLogout = async () => {
    setLogoutLoading(true);
    setActionError(null);

    try {
      await signOut();
      setProfile(null);
      setOverview(emptyOverview);
      setLoading(false);
    } catch (err) {
      setActionError(getProfileErrorMessage(err));
    } finally {
      setLogoutLoading(false);
    }
  };

  const handleCreateProfile = async () => {
    const normalizedUsername = sanitizeUsername(usernameDraft);
    const trimmedDisplayName = displayNameDraft.trim();

    if (!normalizedUsername.match(/^[a-z0-9_]{3,20}$/)) {
      setFormError('Username must be 3-20 characters with letters, numbers, or underscores.');
      return;
    }

    if (trimmedDisplayName.length < 2) {
      setFormError('Display name must be at least 2 characters.');
      return;
    }

    setProfileSubmitting(true);
    setFormError(null);
    setActionError(null);

    try {
      const nextProfile = await createCurrentProfile({
        username: normalizedUsername,
        displayName: trimmedDisplayName,
      });
      setProfile(nextProfile);
      setUsernameDraft(normalizedUsername);
      setDisplayNameDraft(trimmedDisplayName);
      setReloadKey((value) => value + 1);
    } catch (err) {
      setFormError(getProfileErrorMessage(err));
    } finally {
      setProfileSubmitting(false);
    }
  };

  const handleEnableNotifications = async () => {
    setNotificationsSubmitting(true);
    setActionError(null);

    try {
      const nextState = await enablePushNotifications();
      setNotificationState(nextState);
    } finally {
      setNotificationsSubmitting(false);
    }
  };

  const handleReportIssue = async () => {
    try {
      await Linking.openURL(buildBetaIssueMailto(diagnostics));
    } catch {
      setActionError('This device could not open the beta issue draft.');
    }
  };

  const notificationAction = useMemo(
    () => getNotificationAction(notificationState, notificationsLoading, notificationsSubmitting, handleEnableNotifications),
    [notificationState, notificationsLoading, notificationsSubmitting],
  );
  const guestGuardActive = !authLoading && !loading && !userId;

  useEffect(() => {
    if (guestGuardActive && isAvailable) {
      router.replace('/(auth)/login');
    }
  }, [guestGuardActive, isAvailable, router]);

  if (authLoading || loading) {
    return (
      <AppScreen scrollable={false} contentContainerStyle={styles.centered}>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={styles.info}>Loading profile...</Text>
      </AppScreen>
    );
  }

  if (guestGuardActive) {
    return (
      <AppScreen scrollable={false} contentContainerStyle={styles.centered}>
        {isAvailable ? (
          <>
            <ActivityIndicator color={colors.accent} size="large" />
            <Text style={styles.info}>Opening login...</Text>
          </>
        ) : (
          <>
            <Text style={styles.title}>Profile</Text>
            <EmptyState title="Profile requires sign in" description={disabledMessage ?? 'Sign-in is not connected right now.'} />
          </>
        )}
      </AppScreen>
    );
  }

  if (loadError) {
    return (
      <AppScreen scrollable={false} contentContainerStyle={styles.centered}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.error}>{loadError}</Text>
        <SecondaryButton label="Retry" onPress={() => setReloadKey((value) => value + 1)} style={styles.stateButton} />
      </AppScreen>
    );
  }

  return (
    <AppScreen contentContainerStyle={[styles.content, { paddingBottom: bottomContentPadding }]}>
      <ScreenHeader title="Profile" subtitle={getProfileSubtitle(Boolean(profile))} />
      {actionError ? <EmptyState title={actionError} /> : null}

      {!profile ? (
        <>
          <SectionCard tone="accent">
            <View style={styles.identityRow}>
              <ProfileAvatar label={displayNameDraft || currentUser?.email || 'Runner'} />
              <View style={styles.identityCopy}>
                <Text style={styles.identityName}>Finish your profile</Text>
                <Text style={styles.identitySecondary}>{currentUser?.email ?? 'Signed-in beta account'}</Text>
              </View>
            </View>
          </SectionCard>

          <View style={styles.section}>
            <SectionHeader title="Setup" subtitle="Runner identity" />
            <SectionCard>
              <View style={styles.field}>
                <Text style={styles.inputLabel}>Username</Text>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={setUsernameDraft}
                  placeholder="runner_name"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                  value={usernameDraft}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.inputLabel}>Display name</Text>
                <TextInput
                  onChangeText={setDisplayNameDraft}
                  placeholder="Runner Name"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                  value={displayNameDraft}
                />
              </View>

              {formError ? <Text style={styles.errorInline}>{formError}</Text> : null}

              <ActionBar
                primary={
                  <PrimaryButton
                    disabled={profileSubmitting}
                    label={profileSubmitting ? 'Saving...' : 'Finish profile'}
                    onPress={() => void handleCreateProfile()}
                  />
                }
                secondary={
                  <SecondaryButton disabled={logoutLoading} label={logoutLoading ? 'Signing out...' : 'Sign out'} onPress={handleLogout} />
                }
              />
            </SectionCard>
          </View>

          <View style={styles.section}>
            <SectionHeader title="Account" subtitle="Connected access" />
            <View style={styles.actionList}>
              <ActionRow title="Connected account" subtitle={currentUser?.email ?? 'Beta account'} value="Email" tone="muted" />
              <ActionRow
                disabled={logoutLoading}
                onPress={handleLogout}
                subtitle="Remove this beta account from this device"
                title="Sign out"
                tone="danger"
                value={logoutLoading ? 'Signing out...' : undefined}
              />
            </View>
          </View>

          <SupportSection diagnostics={diagnostics} onReportIssue={handleReportIssue} />
        </>
      ) : (
        <>
          <SectionCard tone="accent">
            <View style={styles.identityRow}>
              <ProfileAvatar avatarUrl={profile.avatarUrl} label={profile.displayName} />
              <View style={styles.identityCopy}>
                <Text style={styles.identityName}>{profile.displayName}</Text>
                <Text style={styles.identitySecondary}>
                  @{profile.username}
                  {currentUser?.email ? ` | ${currentUser.email}` : ''}
                </Text>
              </View>
            </View>
          </SectionCard>

          <View style={styles.section}>
            <SectionHeader title="Stats" subtitle="Season snapshot" />
            <View style={styles.statRow}>
              <StatCard helper="Validated" label="Runs" value={`${overview.validatedRuns}`} />
              <StatCard helper={overview.seasonName ?? 'Season'} label="Points" value={`${overview.seasonPoints}`} />
            </View>
            <View style={styles.statRow}>
              <StatCard helper={overview.seasonName ?? 'Season'} label="Rank" value={overview.seasonRank != null ? `#${overview.seasonRank}` : 'Unranked'} />
              <StatCard helper={overview.teamName ? 'Current squad' : 'No squad yet'} label="Team" value={overview.teamName ?? 'None'} />
            </View>
          </View>

          <View style={styles.section}>
            <SectionHeader title="Account" subtitle="Shortcuts and access" />
            <View style={styles.actionList}>
              <ActionRow title="Feed" subtitle="Your run history" value="Open" onPress={() => router.push('/feed')} />
              <ActionRow
                title={overview.teamName ? 'Team' : 'Teams'}
                subtitle={overview.teamName ?? 'Browse squads'}
                value={overview.teamName ? 'Open' : 'Browse'}
                onPress={() =>
                  overview.teamId
                    ? router.push({ pathname: '/teams/[id]', params: { id: overview.teamId } })
                    : router.push('/teams')
                }
              />
              <ActionRow
                disabled={notificationAction.disabled}
                onPress={notificationAction.onPress}
                subtitle={notificationAction.subtitle}
                title="Notifications"
                value={notificationAction.value}
              />
              <ActionRow title="Connected account" subtitle={currentUser?.email ?? 'Beta account'} value="Email" tone="muted" />
              <ActionRow
                disabled={logoutLoading}
                onPress={handleLogout}
                subtitle="Remove this beta account from this device"
                title="Sign out"
                tone="danger"
                value={logoutLoading ? 'Signing out...' : undefined}
              />
            </View>
          </View>

          <SupportSection diagnostics={diagnostics} onReportIssue={handleReportIssue} profileCreatedAt={profile.createdAt} />
        </>
      )}
    </AppScreen>
  );
}

function SupportSection({
  diagnostics,
  onReportIssue,
  profileCreatedAt,
}: {
  diagnostics: ReturnType<typeof useBetaDiagnostics>;
  onReportIssue: () => void;
  profileCreatedAt?: string;
}) {
  const validationMessage = formatValidationReason(diagnostics.activity.validationReason);

  return (
    <View style={styles.section}>
      <SectionHeader title="Beta" subtitle="Build and support" />
      <View style={styles.actionList}>
        <ActionRow title="Report issue" subtitle="Draft an email with diagnostics" value="Open" onPress={onReportIssue} tone="muted" />
      </View>
      <SectionCard tone="muted">
        <InfoRow label="Build" value={getBetaBuildLabel()} />
        <InfoRow label="Screen" value={diagnostics.currentScreen ?? '/profile'} />
        {profileCreatedAt ? <InfoRow label="Joined" value={formatDate(profileCreatedAt)} /> : null}
        <InfoRow label="Run sync" value={formatActivityDiagnostic(diagnostics.activity)} />
        <InfoRow label="Run update" value={formatBetaTimestamp(diagnostics.activity.updatedAt)} />
        <InfoRow label="Push" value={formatNotificationDiagnostic(diagnostics.notification)} />
        {diagnostics.activity.eventId ? <InfoRow label="Event ID" value={diagnostics.activity.eventId} /> : null}
        {diagnostics.activity.activityId ? <InfoRow label="Activity ID" value={diagnostics.activity.activityId} /> : null}
        {diagnostics.activity.acceptedTrackpoints !== null || diagnostics.activity.rejectedTrackpoints !== null ? (
          <InfoRow
            label="Trackpts"
            value={`${diagnostics.activity.acceptedTrackpoints ?? 0} ok / ${diagnostics.activity.rejectedTrackpoints ?? 0} rejected`}
          />
        ) : null}
        {validationMessage ? <Text style={styles.quietNote}>Validation: {validationMessage}</Text> : null}
        {diagnostics.activity.message ? <Text style={styles.quietNote}>Note: {diagnostics.activity.message}</Text> : null}
      </SectionCard>
    </View>
  );
}

function ProfileAvatar({ avatarUrl, label }: { avatarUrl?: string | null; label: string }) {
  const initial = label.trim().charAt(0).toUpperCase() || 'P';

  if (avatarUrl) {
    return <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />;
  }

  return (
    <View style={styles.avatarFallback}>
      <Text style={styles.avatarFallbackText}>{initial}</Text>
    </View>
  );
}

function getNotificationAction(
  state: NotificationRegistrationState | null,
  loading: boolean,
  submitting: boolean,
  onEnable: () => void,
) {
  if (loading) {
    return {
      subtitle: 'Checking device status',
      value: 'Loading',
      disabled: true,
      onPress: undefined,
    };
  }

  if (!state) {
    return {
      subtitle: 'Status unavailable',
      value: 'Later',
      disabled: true,
      onPress: undefined,
    };
  }

  if (submitting) {
    return {
      subtitle: 'Registering this device',
      value: 'Turning on...',
      disabled: true,
      onPress: undefined,
    };
  }

  switch (state.kind) {
    case 'registered':
      return {
        subtitle: 'Route reveal alerts are active',
        value: 'On',
        disabled: true,
        onPress: undefined,
      };
    case 'ready':
      return {
        subtitle: 'Route reveal alerts are ready',
        value: 'Enable',
        disabled: false,
        onPress: onEnable,
      };
    case 'error':
      return {
        subtitle: state.message,
        value: 'Retry',
        disabled: false,
        onPress: onEnable,
      };
    case 'not_ready':
      return {
        subtitle: state.message,
        value: 'Later',
        disabled: true,
        onPress: undefined,
      };
    case 'unsupported':
      return {
        subtitle: state.message,
        value: 'Unavailable',
        disabled: true,
        onPress: undefined,
      };
    case 'signed_out':
    default:
      return {
        subtitle: state.message,
        value: 'Sign in',
        disabled: true,
        onPress: undefined,
      };
  }
}

function getProfileSubtitle(hasProfile: boolean) {
  return hasProfile ? 'Personal identity, season snapshot, and support.' : 'Finish your runner identity.';
}

function sanitizeUsername(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 20);
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatActivityDiagnostic(diagnostic: ReturnType<typeof useBetaDiagnostics>['activity']): string {
  switch (diagnostic.phase) {
    case 'start_requested':
      return 'Starting run sync';
    case 'started':
      return 'Activity started';
    case 'ingesting':
      return 'Trackpoints uploaded';
    case 'finish_requested':
      return 'Finishing run';
    case 'synced':
      return diagnostic.idempotent ? 'Synced from existing result' : 'Run synced';
    case 'rejected':
      return 'Run rejected';
    case 'sync_failed':
      return 'Sync needs attention';
    case 'idle':
    default:
      return 'No recent run sync';
  }
}

function formatNotificationDiagnostic(diagnostic: ReturnType<typeof useBetaDiagnostics>['notification']): string {
  switch (diagnostic.state) {
    case 'ready':
      return 'Device ready';
    case 'registered':
      return 'Device registered';
    case 'unsupported':
      return 'Unsupported';
    case 'not_ready':
      return 'Not ready';
    case 'failed':
      return 'Needs attention';
    case 'idle':
    default:
      return 'No recent action';
  }
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
  errorInline: {
    ...typography.bodySm,
    color: colors.danger,
  },
  stateButton: {
    minWidth: 180,
  },
  section: {
    gap: spacing.sm,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  identityCopy: {
    flex: 1,
    gap: spacing.xxs,
  },
  identityName: {
    ...typography.cardTitle,
    color: colors.textPrimary,
  },
  identitySecondary: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    borderWidth: borderWidth.regular,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceMuted,
  },
  avatarFallback: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    borderWidth: borderWidth.regular,
    borderColor: 'rgba(120, 86, 255, 0.26)',
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionList: {
    gap: spacing.sm,
  },
  field: {
    gap: spacing.xs,
  },
  inputLabel: {
    ...typography.eyebrow,
    color: colors.textMuted,
  },
  input: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: borderWidth.regular,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
    ...typography.body,
  },
  quietNote: {
    ...typography.bodySm,
    color: colors.textMuted,
  },
});
