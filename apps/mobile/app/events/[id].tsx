import { Link, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

export default function EventDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Event {id}</Text>
        <Text style={styles.subtitle}>Route is revealed 4 hours before event start.</Text>
        <Link href={`/run/${id ?? ''}`} style={styles.link}>
          Start run mode
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
