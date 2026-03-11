import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { DEV_MODE_LABEL, getDevModeMessage, isDevRunnerActive } from '@/services/devRunnerMode';
import { nhost } from '@/services/nhostClient';
import {
  enablePushNotifications,
  getNotificationRegistrationState,
  notificationCapabilities,
  type NotificationRegistrationState,
} from '@/services/notificationsService';
import type { CurrentProfile } from '@/services/profileService';
import { fetchCurrentProfile, getProfileErrorMessage } from '@/services/profileService';

export default function ProfileScreen() {
  const router = useRouter();
  const { isAvailable, disabledMessage, loading: authLoading, signOut } = useAuth();
  const userId = nhost.auth.getUser()?.id ?? null;
  const devRunnerActive = isDevRunnerActive();
  const [profile, setProfile] = useState<CurrentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [notificationState, setNotificationState] = useState<NotificationRegistrationState | null>(null);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notificationsSubmitting, setNotificationsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    if (!userId) {
      setProfile(null);
      setError(null);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    const load = async () => {
      setLoading(true);
      setError(null);

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
        setError(getProfileErrorMessage(err));
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
    let active = true;

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
    setError(null);

    try {
      await signOut();
      setProfile(null);
      setLoading(false);
    } catch (err) {
      setError(getProfileErrorMessage(err));
    } finally {
      setLogoutLoading(false);
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
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.heroCard}>
            <Text style={styles.title}>Profile</Text>
            <Text style={styles.info}>You are currently browsing in signed-out mode.</Text>
            <Text style={styles.info}>
              {isAvailable
                ? 'Sign in or create an account to sync your profile, activity feed, and push notifications.'
                : disabledMessage ?? 'Local auth is not available in this environment yet. Use signed-out mode for now.'}
            </Text>
          </View>

          {devRunnerActive ? (
            <View style={styles.devModeCard}>
              <Text style={styles.devModeTitle}>{DEV_MODE_LABEL}</Text>
              <Text style={styles.devModeText}>{getDevModeMessage('profile')}</Text>
            </View>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>What still works</Text>
            <Text style={styles.cardText}>Events, event detail, local join flow, run tracking, leaderboard, and read-only team browsing remain available.</Text>
          </View>

          <NotificationCard
            state={notificationState}
            loading={notificationsLoading}
            submitting={notificationsSubmitting}
            onEnable={handleEnableNotifications}
          />

          <View style={styles.actionColumn}>
            <Pressable style={styles.secondaryButton} onPress={() => router.push('/events')}>
              <Text style={styles.secondaryButtonText}>Browse events</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => router.push('/feed')}>
              <Text style={styles.secondaryButtonText}>Open feed status</Text>
            </Pressable>
            {isAvailable ? (
              <>
                <Pressable style={styles.primaryButton} onPress={() => router.push('/(auth)/login')}>
                  <Text style={styles.primaryButtonText}>Go to login</Text>
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

  if (error) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.error}>{error}</Text>
        <Pressable style={styles.secondaryButton} onPress={() => setReloadKey((value) => value + 1)}>
          <Text style={styles.secondaryButtonText}>Retry</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.info}>No profile record is available for this user yet.</Text>
        <Pressable style={styles.secondaryButton} onPress={() => setReloadKey((value) => value + 1)}>
          <Text style={styles.secondaryButtonText}>Refresh</Text>
        </Pressable>
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
          <Text style={styles.cardTitle}>Profile details</Text>
          <MetaRow label="Display name" value={profile.displayName} />
          <MetaRow label="Username" value={`@${profile.username}`} />
          <MetaRow label="Created" value={formatDate(profile.createdAt)} />
        </View>

        <View style={styles.actionRow}>
          <Pressable style={styles.secondaryButtonCompact} onPress={() => router.push('/feed')}>
            <Text style={styles.secondaryButtonText}>Open feed</Text>
          </Pressable>
          <Pressable style={styles.primaryButtonCompact} onPress={handleLogout} disabled={logoutLoading}>
            <Text style={styles.primaryButtonText}>{logoutLoading ? 'Logging out...' : 'Logout'}</Text>
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
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Notifications</Text>
      {loading ? <Text style={styles.cardText}>Checking device notification support...</Text> : null}
      {!loading && state ? <Text style={styles.cardText}>{state.message}</Text> : null}
      {state?.pushToken ? <Text style={styles.cardText}>Push token: {state.pushToken}</Text> : null}

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

      <Pressable
        style={[styles.secondaryButton, (loading || submitting || state?.kind === 'unsupported' || state?.kind === 'signed_out') && styles.buttonDisabled]}
        onPress={onEnable}
        disabled={loading || submitting || state?.kind === 'unsupported' || state?.kind === 'signed_out'}
      >
        <Text style={styles.secondaryButtonText}>{submitting ? 'Enabling...' : 'Enable push notifications'}</Text>
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
