import { Link, usePathname, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, spacing } from '@/theme/tokens';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const NAV_ITEMS: {
  href: Href;
  label: string;
  icon: IoniconName;
  iconActive: IoniconName;
  isActive: (p: string) => boolean;
}[] = [
  {
    href: '/events' as Href,
    label: 'Events',
    icon: 'calendar-outline',
    iconActive: 'calendar',
    isActive: (p) => p === '/events' || p.startsWith('/events/') || p.startsWith('/run/'),
  },
  {
    href: '/leaderboard' as Href,
    label: 'Leaderboard',
    icon: 'trophy-outline',
    iconActive: 'trophy',
    isActive: (p) => p === '/leaderboard',
  },
  {
    href: '/teams' as Href,
    label: 'Teams',
    icon: 'people-outline',
    iconActive: 'people',
    isActive: (p) => p === '/teams' || p.startsWith('/teams/'),
  },
  {
    href: '/feed' as Href,
    label: 'Feed',
    icon: 'newspaper-outline',
    iconActive: 'newspaper',
    isActive: (p) => p === '/feed' || p === '/profile' || p === '/settings',
  },
];

export function NavBar() {
  const pathname = usePathname() || '/';
  const insets = useSafeAreaInsets();

  if (pathname === '/login' || pathname === '/register') {
    return null;
  }

  const bottomPad = Math.max(insets.bottom, spacing.xs);

  return (
    <View style={[styles.shell, { paddingBottom: bottomPad }]}>
      <View style={styles.bar}>
        {NAV_ITEMS.map((item) => {
          const active = item.isActive(pathname);

          return (
            <Link key={item.label} href={item.href} asChild>
              <Pressable style={styles.item}>
                {active ? (
                  <>
                    <View style={styles.dot} />
                    <View style={styles.activePill}>
                      <Ionicons color="#B38BFF" name={item.iconActive} size={20} />
                    </View>
                  </>
                ) : (
                  <Ionicons color="rgba(255,255,255,0.3)" name={item.icon} size={20} />
                )}
                <Text style={[styles.label, active && styles.labelActive]}>{item.label}</Text>
              </Pressable>
            </Link>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingTop: 0,
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.09)',
    justifyContent: 'space-around',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#B38BFF',
  },
  activePill: {
    backgroundColor: 'rgba(130,80,255,0.20)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(130,80,255,0.30)',
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: fonts.dmSans600,
    color: 'rgba(255,255,255,0.30)',
    letterSpacing: 0.3,
  },
  labelActive: {
    color: '#B38BFF',
  },
});
