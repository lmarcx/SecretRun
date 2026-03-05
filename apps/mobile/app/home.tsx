import { Link } from 'expo-router';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Home</Text>
        <Text style={styles.subtitle}>Navigation hub for all Expo Router screens.</Text>
        <View style={styles.links}>
          <Link href="/(auth)/login" style={styles.link}>
            (auth)/login
          </Link>
          <Link href="/(auth)/register" style={styles.link}>
            (auth)/register
          </Link>
          <Link href="/home" style={styles.link}>
            home
          </Link>
          <Link href="/events" style={styles.link}>
            events/index
          </Link>
          <Link href="/events/evt-demo" style={styles.link}>
            events/[id]
          </Link>
          <Link href="/run/evt-demo" style={styles.link}>
            run/[eventId]
          </Link>
          <Link href="/feed" style={styles.link}>
            feed
          </Link>
          <Link href="/profile" style={styles.link}>
            profile
          </Link>
          <Link href="/leaderboard" style={styles.link}>
            leaderboard
          </Link>
          <Link href="/teams" style={styles.link}>
            teams/index
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 16,
    color: '#334155',
    textAlign: 'center',
  },
  links: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  link: {
    color: '#2563eb',
    fontSize: 15,
    fontWeight: '600',
  },
});
