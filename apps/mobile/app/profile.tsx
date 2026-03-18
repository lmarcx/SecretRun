import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, type BetaAccessState } from '@/hooks/useAuth';
import { DEV_MODE_LABEL, getDevModeMessage } from '@/services/devRunnerMode';
import { nhost } from '@/services/nhostClient';
import {
  enablePushNotifications,
  getNotificationRegistrationState,
  notificationCapabilities,
  type NotificationRegistrationState,
} from '@/services/notificationsService';
import type { CurrentProfile } from '@/services/profileService';
import { createCurrentProfile, fetchCurrentProfile, getProfileErrorMessage } from '@/services/profileService';

export default function ProfileScreen() {
  const router = useRouter();
  const { isAvailable, disabledMessage, loading: authLoading, signOut, betaAccessState } = useAuth();
  const currentUser = nhost.auth.getUser();
  const userId = currentUser?.id ?? null;
  const [profile, setProfile] = useState<CurrentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [screenError, setScreenError] = useState<string | null>(null);
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
      setScreenError(null);
      setFormError(null);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    const load = async () => {
      setLoading(true);
      setScreenError(null);

      try {
        const nextProfile = await fetchCurrentProfile();
        if (!active) {
          return;
        }

        setProfile(nextProfile);
      } catch (err) {
        if (!active) {
          return;
        }

        setProfile(null);
        setScreenError(getProfileErrorMessage(err));
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
    setScreenError(null);

    try {
      await signOut();
      setProfile(null);
      setLoading(false);
    } catch (err) {
      setScreenError(getProfileErrorMessage(err));
    } finally {
      setLogoutLoading(false);
    }
  };

  const handleCreateProfile = async () => {
    const normalizedUsername = sanitizeUsername(usernameDraft);
    const trimmedDisplayName = displayNameDraft.trim();

    if (!normalizedUsername.match(/^[a-z0-9_]{3,20}$/)) {
      setFormError('Username must be 3-20 characters and use only letters, numbers, or underscores.');
      return;
    }

    if (trimmedDisplayName.length < 2) {
      setFormError('Display name must be at least 2 characters.');
      return;
    }

    setProfileSubmitting(true);
    setFormError(null);

    try {
      const nextProfile = await createCurrentProfile({
        username: normalizedUsername,
        displayName: trimmedDisplayName,
      });
      setProfile(nextProfile);
      setUsernameDraft(normalizedUsername);
      setDisplayNameDraft(trimmedDisplayName);
    } catch (err) {
      setFormError(getProfileErrorMessage(err));
    } finally {
      setProfileSubmitting(false);
    }
  };

  const handleEnableNotifications = async () => {
    setNotificationsSubmitting(true);
    const nextState = await enablePushNotifications();
    setNotificationState(nextState);
    setNotificationsSubmitting(false);
  };

  if (authLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.info}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  if (!userId) {
    const guestCopy = getGuestProfileCopy(betaAccessState, disabledMessage);

    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.heroCard}>
            <Text style={styles.title}>Profile</Text>
            <Text style={styles.cardText}>{guestCopy.title}</Text>
            <Text style={styles.info}>{guestCopy.description}</Text>
          </View>

          {betaAccessState === 'dev_runner' ? (
            <View style={styles.devModeCard}>
              <Text style={styles.devModeTitle}>{DEV_MODE_LABEL}</Text>
              <Text style={styles.devModeText}>{getDevModeMessage('profile')}</Text>
            </View>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>What still works</Text>
            <Text style={styles.cardText}>
              Events, event details, local run testing, and leaderboard browsing remain available without a signed-in beta
              account.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Notifications</Text>
            <Text style={styles.cardText}>
              Notifications become available after sign-in on a supported mobile device. They stay off in guest mode and
              DEV runner mode.
            </Text>
          </View>

          <View style={styles.actionColumn}>
            <Pressable style={styles.secondaryButton} onPress={() => router.push('/events')}>
              <Text style={styles.secondaryButtonText}>Browse events</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => router.push('/leaderboard')}>
              <Text style={styles.secondaryButtonText}>Open leaderboard</Text>
            </Pressable>
            {isAvailable ? (
              <>
                <Pressable style={styles.primaryButton} onPress={() => router.push('/(auth)/login')}>
                  <Text style={styles.primaryButtonText}>Sign in</Text>
                </Pressable>
                <Pressable style={styles.secondaryButton} onPress={() => router.push('/(auth)/register')}>
                  <Text style={styles.secondaryButtonText}>Create account</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.info}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  if (screenError) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.error}>{screenError}</Text>
        <Pressable style={styles.secondaryButton} onPress={() => setReloadKey((value) => value + 1)}>
          <Text style={styles.secondaryButtonText}>Retry</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.heroCard}>
            <Text style={styles.title}>Finish your profile</Text>
            <Text style={styles.info}>
              Your beta account is signed in on this device, but the runner profile is not ready yet. Finish it here to
              unlock the full beta path.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Runner profile</Text>
            <Text style={styles.cardText}>
              This profile is used for your personal feed, team membership details, and leaderboard identity.
            </Text>

            <View style={styles.field}>
              <Text style={styles.inputLabel}>Username</Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setUsernameDraft}
                placeholder="runner_name"
                style={styles.input}
                value={usernameDraft}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.inputLabel}>Display name</Text>
              <TextInput onChangeText={setDisplayNameDraft} placeholder="Runner Name" style={styles.input} value={displayNameDraft} />
            </View>

            {formError ? <Text style={styles.errorInline}>{formError}</Text> : null}

            <View style={styles.actionColumn}>
              <Pressable
                style={[styles.primaryButton, profileSubmitting && styles.buttonDisabled]}
                onPress={() => void handleCreateProfile()}
                disabled={profileSubmitting}
              >
                <Text style={styles.primaryButtonText}>{profileSubmitting ? 'Saving profile...' : 'Finish profile'}</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={handleLogout} disabled={logoutLoading}>
                <Text style={styles.secondaryButtonText}>{logoutLoading ? 'Signing out...' : 'Sign out'}</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroCard}>
          <View style={styles.identitySection}>
            {profile.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarFallbackText}>{profile.displayName.slice(0, 1).toUpperCase()}</Text>
              </View>
            )}

            <Text style={styles.title}>{profile.displayName}</Text>
            <Text style={styles.username}>@{profile.username}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Beta account</Text>
          <Text style={styles.cardText}>
            Signed in and synced on this device. Your personal feed, team details, and supported notifications now use this
            profile.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Profile details</Text>
          <MetaRow label="Display name" value={profile.displayName} />
          <MetaRow label="Username" value={`@${profile.username}`} />
          <MetaRow label="Created" value={formatDate(profile.createdAt)} />
        </View>

        <View style={styles.actionRow}>
          <Pressable style={styles.secondaryButtonCompact} onPress={() => router.push('/feed')}>
            <Text style={styles.secondaryButtonText}>Open feed</Text>
          </Pressable>
          <Pressable style={styles.secondaryButtonCompact} onPress={() => router.push('/teams')}>
            <Text style={styles.secondaryButtonText}>Open teams</Text>
          </Pressable>
        </View>

        <View style={styles.actionRow}>
          <Pressable style={styles.primaryButtonCompact} onPress={handleLogout} disabled={logoutLoading}>
            <Text style={styles.primaryButtonText}>{logoutLoading ? 'Signing out...' : 'Sign out'}</Text>
          </Pressable>
        </View>

        <NotificationCard
          state={notificationState}
          loading={notificationsLoading}
          submitting={notificationsSubmitting}
          onEnable={handleEnableNotifications}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function NotificationCard({
  state,
  loading,
  submitting,
  onEnable,
}: {
  state: NotificationRegistrationState | null;
  loading: boolean;
  submitting: boolean;
  onEnable: () => void;
}) {
  const buttonDisabled =
    loading || submitting || !state || state.kind === 'unsupported' || state.kind === 'signed_out' || state.kind === 'registered';
  const buttonLabel = state?.kind === 'registered' ? 'Notifications enabled' : submitting ? 'Turning on...' : 'Enable notifications';

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Notifications</Text>
      {loading ? <Text style={styles.cardText}>Checking device notification support...</Text> : null}
      {!loading && state ? <Text style={styles.cardText}>{state.message}</Text> : null}

      <View style={styles.notificationList}>
        {notificationCapabilities.map((capability) => (
          <View key={capability.key} style={styles.notificationRow}>
            <View style={styles.notificationTextBlock}>
              <Text style={styles.notificationLabel}>{capability.label}</Text>
              <Text style={styles.notificationDescription}>{capability.description}</Text>
            </View>
            <View style={[styles.statusBadge, capability.status === 'supported' ? styles.statusSupported : styles.statusNotReady]}>
              <Text style={[styles.statusBadgeText, capability.status === 'supported' ? styles.statusSupportedText : styles.statusNotReadyText]}>
                {capability.status === 'supported' ? 'Ready' : 'Later'}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <Pressable style={[styles.secondaryButton, buttonDisabled && styles.buttonDisabled]} onPress={onEnable} disabled={buttonDisabled}>
        <Text style={styles.secondaryButtonText}>{buttonLabel}</Text>
      </Pressable>
    </View>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function getGuestProfileCopy(betaAccessState: BetaAccessState, disabledMessage: string | null | undefined) {
  switch (betaAccessState) {
    case 'dev_runner':
      return {
        title: 'DEV runner is active on this device.',
        description:
          'Sign in with a beta account when you want synced profile access. DEV runner remains local-only for events and runs.',
      };
    case 'auth_unavailable':
      return {
        title: 'Guest mode is active.',
        description: disabledMessage ?? 'Sign-in is not connected in this environment yet.',
      };
    case 'signed_out':
    case 'loading':
    default:
      return {
        title: 'You are browsing in guest mode.',
        description:
          'Sign in or create an account to sync your runner profile, personal feed, team details, and supported notifications.',
      };
  }
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
  return new Date(value).toLocaleDateString();
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    padding: 24,
    gap: 16,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
    backgroundColor: '#f8fafc',
  },
  heroCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 18,
    gap: 10,
  },
  identitySection: {
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: '#cbd5e1',
  },
  avatarFallback: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: '700',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  username: {
    fontSize: 16,
    color: '#475569',
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 16,
    gap: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  cardText: {
    color: '#475569',
    lineHeight: 20,
  },
  info: {
    textAlign: 'center',
    color: '#475569',
    lineHeight: 21,
  },
  error: {
    textAlign: 'center',
    color: '#b91c1c',
    fontWeight: '600',
  },
  errorInline: {
    color: '#b91c1c',
    fontWeight: '600',
  },
  devModeCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f59e0b',
    backgroundColor: '#fffbeb',
    padding: 16,
    gap: 6,
  },
  devModeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400e',
    textTransform: 'uppercase',
  },
  devModeText: {
    color: '#92400e',
    lineHeight: 20,
  },
  field: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    textTransform: 'uppercase',
  },
  input: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    color: '#0f172a',
  },
  notificationList: {
    gap: 10,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  notificationTextBlock: {
    flex: 1,
    gap: 2,
  },
  notificationLabel: {
    color: '#0f172a',
    fontWeight: '700',
  },
  notificationDescription: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 18,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusSupported: {
    backgroundColor: '#dcfce7',
  },
  statusNotReady: {
    backgroundColor: '#e2e8f0',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusSupportedText: {
    color: '#166534',
  },
  statusNotReadyText: {
    color: '#475569',
  },
  metaRow: {
    gap: 2,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: 16,
    color: '#0f172a',
  },
  actionColumn: {
    gap: 10,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    paddingHorizontal: 18,
  },
  primaryButtonCompact: {
    flex: 1,
    minHeight: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 18,
  },
  secondaryButtonCompact: {
    flex: 1,
    minHeight: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 18,
  },
  secondaryButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
