import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const primaryRoutes = [
  { href: '/events', label: 'Events' },
  { href: '/feed', label: 'Feed' },
  { href: '/profile', label: 'Profile' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/teams', label: 'Teams' },
] as const;

export function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.title}>Secret Run</Text>
          <Text style={styles.subtitle}>Test entry point for the Expo Router MVP.</Text>
        </View>
        <View style={styles.grid}>
          {primaryRoutes.map((route) => (
            <Link key={route.href} href={route.href} asChild>
              <Pressable style={styles.button}>
                <Text style={styles.buttonText}>{route.label}</Text>
              </Pressable>
            </Link>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
    gap: 24,
  },
  hero: {
    gap: 10,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#475569',
    textAlign: 'center',
  },
  grid: {
    gap: 12,
  },
  button: {
    minHeight: 56,
    borderRadius: 14,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
