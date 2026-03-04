import { Link } from 'expo-router';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

export default function EventsScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Events</Text>
        <Text style={styles.subtitle}>Upcoming runs with hidden routes.</Text>
        <Link href="/events/evt-demo" style={styles.link}>
          Open demo event
        </Link>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  title: { fontSize: 30, fontWeight: '700', color: '#0f172a' },
  subtitle: { color: '#334155' },
  link: { color: '#2563eb', fontWeight: '600' },
});
