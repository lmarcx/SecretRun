import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/hooks/useAuth';

export default function RegisterScreen() {
  const router = useRouter();
  const { isConfigured, signUp, loading } = useAuth();

  const handleRegister = async () => {
    if (!isConfigured) {
      return;
    }

    await signUp('runner@example.com', 'Password123!');
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create account</Text>
      <Text style={styles.subtitle}>Registration placeholder wired to Nhost auth service.</Text>
      <Text style={styles.note}>
        {isConfigured ? 'Demo registration is enabled.' : 'Auth is disabled until the Nhost env vars are set.'}
      </Text>
      <Pressable
        style={[styles.button, !isConfigured && styles.buttonDisabled]}
        onPress={handleRegister}
        disabled={loading || !isConfigured}
      >
        <Text style={styles.buttonText}>{loading ? 'Creating...' : 'Register (demo)'}</Text>
      </Pressable>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.link}>Back to login</Text>
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
