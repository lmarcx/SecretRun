import { Link, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const navigationItems = [
  {
    href: '/events',
    label: 'Events',
    isActive: (pathname: string) =>
      pathname === '/events' || pathname.startsWith('/events/') || pathname.startsWith('/run/'),
  },
  {
    href: '/leaderboard',
    label: 'Leaderboard',
    isActive: (pathname: string) => pathname === '/leaderboard',
  },
  {
    href: '/teams',
    label: 'Teams',
    isActive: (pathname: string) => pathname === '/teams' || pathname.startsWith('/teams/'),
  },
  {
    href: '/profile',
    label: 'Profile',
    isActive: (pathname: string) => pathname === '/profile',
  },
] as const;

export function AppNavigationShell() {
  const pathname = usePathname() || '/';
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.shell, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {navigationItems.map((item) => {
        const active = item.isActive(pathname);

        return (
          <Link key={item.href} href={item.href} asChild>
            <Pressable style={StyleSheet.flatten([styles.item, active && styles.itemActive])}>
              <Text
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                numberOfLines={1}
                style={StyleSheet.flatten([styles.label, active && styles.labelActive])}
              >
                {item.label}
              </Text>
            </Pressable>
          </Link>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingTop: 8,
    gap: 6,
  },
  item: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 6,
  },
  itemActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  label: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  labelActive: {
    color: '#ffffff',
  },
});
