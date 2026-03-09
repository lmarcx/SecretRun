import { usePathname } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { nhost } from '@/services/nhostClient';

export function DebugAuthBanner() {
  const pathname = usePathname();
  const { authState } = useAuth();
  const userId = nhost.auth.getUser()?.id ?? 'none';

  return (
    <View style={styles.banner}>
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
});
