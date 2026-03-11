import { useState } from 'react';
import { Redirect, useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { getAuthErrorMessage, useAuth } from '@/hooks/useAuth';

export default function LoginScreen() {
  const router = useRouter();
  const { isAuthenticated, isAvailable, disabledMessage, signIn, loading } = useAuth();
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
      setError(disabledMessage ?? 'Local auth is not available in this environment yet. Use signed-out mode for now.');
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
        setError('MFA is not supported in this MVP yet.');
        return;
      }

      router.replace('/events');
    } catch (err) {
      setError(getAuthErrorMessage(err));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <View style={styles.container}>
          <View style={styles.hero}>
            <Text style={styles.title}>Sign in</Text>
            <Text style={styles.subtitle}>Use your email and password to join Secret Run events.</Text>
            <Text style={styles.note}>{isAvailable ? 'Signed-out state is active until you authenticate.' : disabledMessage}</Text>
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
            <Text style={styles.footerText}>Need an account?</Text>
            <Pressable onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.link}>Register</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    color: '#475569',
  },
  link: {
    color: '#2563eb',
    fontWeight: '700',
  },
});
