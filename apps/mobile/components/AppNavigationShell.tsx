import { Link, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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

  return (
    <View style={styles.shell}>
      {navigationItems.map((item) => {
        const active = item.isActive(pathname);

        return (
          <Link key={item.href} href={item.href} asChild>
            <Pressable style={StyleSheet.flatten([styles.item, active && styles.itemActive])}>
              <Text style={StyleSheet.flatten([styles.label, active && styles.labelActive])}>
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  item: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
  },
  itemActive: {
    backgroundColor: '#0f172a',
  },
  label: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '700',
  },
  labelActive: {
    color: '#ffffff',
  },
});