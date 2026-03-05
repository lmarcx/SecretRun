import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { nhost } from '@/services/nhostClient';

export function DebugAuthBanner() {
  const { isAuthenticated } = useAuth();
  const userId = nhost.auth.getUser()?.id ?? 'none';

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>
        Auth: {isAuthenticated ? 'signed in' : 'signed out'} | user id: {userId}
      </Text>
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
  },
  text: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '600',
  },
});
