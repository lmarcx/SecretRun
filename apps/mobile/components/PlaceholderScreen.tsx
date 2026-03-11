import type { ReactNode } from 'react';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface PlaceholderScreenProps {
  title: string;
  subtitle: string;
  children?: ReactNode;
}

const mainLinks = [
  { href: '/', label: 'Home' },
  { href: '/events', label: 'Events' },
  { href: '/feed', label: 'Feed' },
  { href: '/profile', label: 'Profile' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/teams', label: 'Teams' },
] as const;

export function PlaceholderScreen({ title, subtitle, children }: PlaceholderScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {children}
        <View style={styles.links}>
          {mainLinks.map((link) => (
            <Link key={link.href} href={link.href} asChild>
              <Pressable style={styles.linkButton}>
                <Text style={styles.linkText}>{link.label}</Text>
              </Pressable>
            </Link>
          ))}
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
    paddingHorizontal: 20,
    gap: 12,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#334155',
  },
  links: {
    marginTop: 20,
    gap: 12,
    width: '100%',
  },
  linkButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 16,
  },
  linkText: {
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '600',
  },
});
