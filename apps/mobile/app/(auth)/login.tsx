import { Redirect, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/hooks/useAuth';

export default function LoginScreen() {
  const router = useRouter();
  const { isAuthenticated, isConfigured, signIn, loading } = useAuth();

  if (isAuthenticated) {
    return <Redirect href="/" />;
  }

  const handleLogin = async () => {
    if (!isConfigured) {
      return;
    }

    await signIn('runner@example.com', 'Password123!');
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Secret Run</Text>
      <Text style={styles.subtitle}>Join runs where the route unlocks 4 hours before the start.</Text>
      <Text style={styles.note}>
        {isConfigured ? 'Auth screen is wired for demo login.' : 'Auth is disabled until the Nhost env vars are set.'}
      </Text>
      <Pressable style={[styles.button, !isConfigured && styles.buttonDisabled]} onPress={handleLogin} disabled={loading || !isConfigured}>
        <Text style={styles.buttonText}>{loading ? 'Signing in...' : 'Login (demo)'}</Text>
      </Pressable>
      <Pressable onPress={() => router.push('/(auth)/register')}>
        <Text style={styles.link}>Create account</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 16,
    backgroundColor: '#f8fafc',
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
  button: {
    backgroundColor: '#0f172a',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#94a3b8',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  link: {
    color: '#2563eb',
    fontWeight: '500',
  },
});
