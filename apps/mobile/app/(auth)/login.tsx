import { Redirect, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/hooks/useAuth';

export default function LoginScreen() {
  const router = useRouter();
  const { isAuthenticated, signIn, loading } = useAuth();

  if (isAuthenticated) {
    return <Redirect href="/home" />;
  }

  const handleLogin = async () => {
    await signIn('runner@example.com', 'Password123!');
    router.replace('/home');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Secret Run</Text>
      <Text style={styles.subtitle}>Join runs where the route unlocks 4 hours before the start.</Text>
      <Pressable style={styles.button} onPress={handleLogin} disabled={loading}>
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
  button: {
    backgroundColor: '#0f172a',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
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
