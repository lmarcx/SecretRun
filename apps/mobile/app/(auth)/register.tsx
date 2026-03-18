import { useState } from 'react';
import { Redirect, useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAuthErrorMessage, useAuth, type BetaAccessState } from '@/hooks/useAuth';
import { createCurrentProfile, getProfileErrorMessage } from '@/services/profileService';

export default function RegisterScreen() {
  const router = useRouter();
  const { isAuthenticated, isAvailable, disabledMessage, signUp, loading, betaAccessState } = useAuth();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [accountReady, setAccountReady] = useState(false);

  if (isAuthenticated && !accountReady) {
    return <Redirect href="/events" />;
  }

  const handleRegister = async () => {
    const normalizedUsername = username.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedDisplayName = displayName.trim();

    if (!normalizedUsername.match(/^[a-z0-9_]{3,20}$/)) {
      setError('Username must be 3-20 characters and use only letters, numbers, or underscores.');
      return;
    }

    if (trimmedDisplayName.length < 2) {
      setError('Display name must be at least 2 characters.');
      return;
    }

    if (!normalizedEmail.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (!isAvailable) {
      setError(disabledMessage ?? 'Sign-in is not connected in this environment yet.');
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      if (!isAuthenticated) {
        const response = await signUp(normalizedEmail, password);

        if (response.needsEmailVerification) {
          setAccountReady(false);
          setSuccess('Account created. Verify your email, then sign in.');
          return;
        }

        setAccountReady(true);
      }

      try {
        await createCurrentProfile({
          username: normalizedUsername,
          displayName: trimmedDisplayName,
        });
      } catch (profileError) {
        setAccountReady(true);
        setError(
          `${getProfileErrorMessage(profileError)} Update the profile fields below and try again to finish beta setup.`,
        );
        return;
      }

      router.replace('/events');
    } catch (err) {
      setAccountReady(false);
      setError(getAuthErrorMessage(err));
    }
  };

  const accessStateCopy = getRegisterAccessStateCopy(betaAccessState, disabledMessage);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <View style={styles.container}>
          <View style={styles.hero}>
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>
              Beta accounts are the preferred path for profile sync, private feed access, team details, and supported notifications.
            </Text>
          </View>

          <View style={styles.stateCard}>
            <Text style={styles.stateLabel}>Current device state</Text>
            <Text style={styles.stateTitle}>{accessStateCopy.title}</Text>
            <Text style={styles.note}>{accessStateCopy.description}</Text>
            {accountReady && isAuthenticated ? (
              <Text style={styles.success}>Your account is signed in on this device. Finish the runner profile below.</Text>
            ) : null}
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setUsername}
                placeholder="runner_name"
                style={styles.input}
                value={username}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Display name</Text>
              <TextInput onChangeText={setDisplayName} placeholder="Runner Name" style={styles.input} value={displayName} />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                onChangeText={setEmail}
                placeholder="runner@example.com"
                style={styles.input}
                value={email}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setPassword}
                placeholder="At least 8 characters"
                secureTextEntry
                style={styles.input}
                value={password}
              />
            </View>

            {!isAvailable ? <Text style={styles.warning}>{disabledMessage}</Text> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {success ? <Text style={styles.success}>{success}</Text> : null}

            <Pressable
              style={[styles.button, (!isAvailable || loading) && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading || !isAvailable}
            >
              <Text style={styles.buttonText}>{isAvailable ? (loading ? 'Creating account...' : 'Create account') : 'Registration unavailable'}</Text>
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Pressable style={styles.secondaryButton} onPress={() => router.replace('/events')}>
              <Text style={styles.secondaryButtonText}>Browse as guest</Text>
            </Pressable>
            <Pressable onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.link}>Sign in</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function getRegisterAccessStateCopy(betaAccessState: BetaAccessState, disabledMessage: string | null | undefined) {
  switch (betaAccessState) {
    case 'dev_runner':
      return {
        title: 'DEV runner stays local only',
        description:
          'DEV runner can still test event and run flows on this device, but it does not create a synced beta profile.',
      };
    case 'auth_unavailable':
      return {
        title: 'Account setup not ready here',
        description: disabledMessage ?? 'This local environment is still guest-only right now.',
      };
    case 'signed_out':
    case 'loading':
    default:
      return {
        title: 'Create your beta path',
        description: 'This creates your sign-in first, then your runner profile for the closed beta.',
      };
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  keyboard: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 24,
  },
  hero: {
    gap: 10,
  },
  stateCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 16,
    gap: 6,
  },
  form: {
    gap: 16,
  },
  field: {
    gap: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 16,
    color: '#334155',
  },
  note: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  stateLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  label: {
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
  button: {
    backgroundColor: '#0f172a',
    minHeight: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#94a3b8',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  error: {
    color: '#b91c1c',
    fontWeight: '600',
  },
  success: {
    color: '#166534',
    fontWeight: '600',
  },
  warning: {
    color: '#7c2d12',
    fontWeight: '600',
  },
  footer: {
    gap: 12,
  },
  link: {
    color: '#2563eb',
    fontWeight: '700',
    textAlign: 'center',
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 16,
  },
});
