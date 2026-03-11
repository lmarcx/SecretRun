import { usePathname } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { getEffectiveRunner, isDevRunnerActive } from '@/services/devRunnerMode';
import { nhost } from '@/services/nhostClient';

export function DebugAuthBanner() {
  const pathname = usePathname();
  const { authState } = useAuth();
  const userId = nhost.auth.getUser()?.id ?? getEffectiveRunner()?.id ?? 'none';
  const devRunnerActive = isDevRunnerActive();

  return (
    <View style={styles.banner}>
      {devRunnerActive ? <Text style={styles.devMode}>DEV MODE</Text> : null}
      <Text style={styles.text}>Route: {pathname || '/'}</Text>
      <Text style={styles.text}>Auth: {authState}</Text>
      <Text style={styles.text}>User: {userId}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    gap: 2,
  },
  text: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '600',
  },
  devMode: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#92400e',
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
});
