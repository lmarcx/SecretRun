import { Link, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  APP_NAVIGATION_BOTTOM_PADDING,
  APP_NAVIGATION_ITEM_HEIGHT,
  APP_NAVIGATION_TOP_PADDING,
} from '@/theme/layout';
import { borderWidth, colors, radius, spacing, typography } from '@/theme/tokens';

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
    href: '/feed',
    label: 'Feed',
    isActive: (pathname: string) =>
      pathname === '/feed' || pathname === '/profile' || pathname === '/settings',
  },
] as const;

export function AppNavigationShell() {
  const pathname = usePathname() || '/';
  const insets = useSafeAreaInsets();

  if (pathname === '/login' || pathname === '/register') {
    return null;
  }

  return (
    <View style={[styles.shell, { paddingBottom: Math.max(insets.bottom, APP_NAVIGATION_BOTTOM_PADDING) }]}>
      <View style={styles.bar}>
        {navigationItems.map((item) => {
          const active = item.isActive(pathname);

          return (
            <Link key={item.href} href={item.href} asChild>
              <Pressable style={StyleSheet.flatten([styles.item, active && styles.itemActive])}>
                {active ? <View style={styles.activeDot} /> : null}
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
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xxs,
  },
  bar: {
    flexDirection: 'row',
    borderWidth: borderWidth.regular,
    borderColor: colors.borderStrong,
    backgroundColor: colors.backgroundRaised,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.xs,
    paddingTop: APP_NAVIGATION_TOP_PADDING,
    paddingBottom: APP_NAVIGATION_TOP_PADDING,
    gap: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.50,
    shadowRadius: 20,
    elevation: 12,
  },
  item: {
    flex: 1,
    minHeight: APP_NAVIGATION_ITEM_HEIGHT,
    borderRadius: radius.lg,
    borderWidth: borderWidth.regular,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    gap: spacing.xxs,
  },
  itemActive: {
    backgroundColor: colors.accentSoft,
    borderColor: 'rgba(139, 92, 246, 0.32)',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  label: {
    ...typography.bodySm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  labelActive: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
});
