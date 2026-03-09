import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Image, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { nhost } from '@/services/nhostClient';
import type { CurrentProfile } from '@/services/profileService';
import { fetchCurrentProfile, getProfileErrorMessage } from '@/services/profileService';

export default function ProfileScreen() {
  const router = useRouter();
  const { loading: authLoading, signOut } = useAuth();
  const userId = nhost.auth.getUser()?.id ?? null;
  const [profile, setProfile] = useState<CurrentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logoutLoading, setLogoutLoading] = useState(false);

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
      <SafeAreaView style={styles.centered}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.info}>You are currently signed out.</Text>
        <Pressable style={styles.primaryButton} onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.primaryButtonText}>Go to login</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => router.push('/(auth)/register')}>
          <Text style={styles.secondaryButtonText}>Create account</Text>
        </Pressable>
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
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.info}>No profile record is available for this user yet.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {profile.avatarUrl ? (
          <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarFallbackText}>{profile.displayName.slice(0, 1).toUpperCase()}</Text>
          </View>
        )}

        <Text style={styles.title}>{profile.displayName}</Text>
        <Text style={styles.username}>@{profile.username}</Text>

        <View style={styles.metaCard}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Display name</Text>
            <Text style={styles.metaValue}>{profile.displayName}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Username</Text>
            <Text style={styles.metaValue}>@{profile.username}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Created</Text>
            <Text style={styles.metaValue}>{formatDate(profile.createdAt)}</Text>
          </View>
        </View>

        <Pressable style={styles.primaryButton} onPress={handleLogout} disabled={logoutLoading}>
          <Text style={styles.primaryButtonText}>{logoutLoading ? 'Logging out...' : 'Logout'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  username: {
    fontSize: 16,
    color: '#475569',
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
  metaCard: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 16,
    gap: 12,
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
  primaryButton: {
    minHeight: 52,
    minWidth: 220,
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
    minWidth: 220,
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
});
