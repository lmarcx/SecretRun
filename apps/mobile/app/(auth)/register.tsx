import { useState } from 'react';
import { Redirect, useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { getAuthErrorMessage, useAuth } from '@/hooks/useAuth';
import { createCurrentProfile, getProfileErrorMessage } from '@/services/profileService';

export default function RegisterScreen() {
  const router = useRouter();
  const { isAuthenticated, isAvailable, disabledMessage, signUp, loading } = useAuth();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (isAuthenticated) {
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
      setError(disabledMessage ?? 'Local auth is not available in this environment yet. Use signed-out mode for now.');
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const response = await signUp(normalizedEmail, password);

      if (response.needsEmailVerification) {
        setSuccess('Account created. Verify your email, then sign in.');
        return;
      }

      try {
        await createCurrentProfile({
          username: normalizedUsername,
          displayName: trimmedDisplayName,
        });
      } catch (profileError) {
        setError(getProfileErrorMessage(profileError));
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
            <Text style={styles.title}>Register</Text>
            <Text style={styles.subtitle}>Create a simple account and profile for Sprint 1.</Text>
            <Text style={styles.note}>
              {isAvailable
                ? 'This creates auth credentials first, then attempts to create the matching profile row.'
                : disabledMessage}
            </Text>
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
            <Text style={styles.footerText}>Already have an account?</Text>
            <Pressable onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.link}>Sign in</Text>
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
