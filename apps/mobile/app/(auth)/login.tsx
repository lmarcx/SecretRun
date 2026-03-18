import { useState } from 'react';
import { Redirect, useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAuthErrorMessage, useAuth, type BetaAccessState } from '@/hooks/useAuth';

export default function LoginScreen() {
  const router = useRouter();
  const { isAuthenticated, isAvailable, disabledMessage, signIn, loading, betaAccessState } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated) {
    return <Redirect href="/events" />;
  }

  const handleLogin = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setError('Enter your email and password.');
      return;
    }

    if (!isAvailable) {
      setError(disabledMessage ?? 'Sign-in is not connected in this environment yet.');
      return;
    }

    setError(null);

    try {
      const response = await signIn(normalizedEmail, password);

      if (response.needsEmailVerification) {
        setError('Verify your email before signing in.');
        return;
      }

      if (response.needsMfaOtp) {
        setError('This beta does not support multi-factor sign-in yet.');
        return;
      }

      router.replace('/events');
    } catch (err) {
      setError(getAuthErrorMessage(err));
    }
  };

  const accessStateCopy = getAccessStateCopy(betaAccessState, disabledMessage);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <View style={styles.container}>
          <View style={styles.hero}>
            <Text style={styles.title}>Sign in</Text>
            <Text style={styles.subtitle}>
              Use your beta account to unlock profile sync, your personal feed, team details, and supported notifications.
            </Text>
          </View>

          <View style={styles.stateCard}>
            <Text style={styles.stateLabel}>Current device state</Text>
            <Text style={styles.stateTitle}>{accessStateCopy.title}</Text>
            <Text style={styles.note}>{accessStateCopy.description}</Text>
          </View>

          <View style={styles.form}>
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
                placeholder="Password"
                secureTextEntry
                style={styles.input}
                value={password}
              />
            </View>

            {!isAvailable ? <Text style={styles.warning}>{disabledMessage}</Text> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              style={[styles.button, (!isAvailable || loading) && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading || !isAvailable}
            >
              <Text style={styles.buttonText}>{isAvailable ? (loading ? 'Signing in...' : 'Sign in') : 'Sign in unavailable'}</Text>
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Pressable style={styles.secondaryButton} onPress={() => router.replace('/events')}>
              <Text style={styles.secondaryButtonText}>Browse as guest</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.link}>Create account</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function getAccessStateCopy(betaAccessState: BetaAccessState, disabledMessage: string | null | undefined) {
  switch (betaAccessState) {
    case 'dev_runner':
      return {
        title: 'DEV runner also available',
        description:
          'You can still test events and runs locally without signing in, but the closed beta account path remains the preferred experience.',
      };
    case 'auth_unavailable':
      return {
        title: 'Sign-in not ready here',
        description: disabledMessage ?? 'This local environment is still guest-only right now.',
      };
    case 'signed_out':
    case 'loading':
    default:
      return {
        title: 'Guest mode active',
        description: 'Sign in to switch this device from guest browsing to a synced beta account.',
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
    fontSize: 32,
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
