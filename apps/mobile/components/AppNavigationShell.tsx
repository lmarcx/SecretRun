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
    borderTopWidth: borderWidth.regular,
    borderTopColor: colors.border,
    backgroundColor: colors.backgroundRaised,
    paddingHorizontal: spacing.xs,
    paddingTop: APP_NAVIGATION_TOP_PADDING,
    gap: spacing.xs,
  },
  item: {
    flex: 1,
    minHeight: APP_NAVIGATION_ITEM_HEIGHT,
    borderRadius: radius.md,
    borderWidth: borderWidth.regular,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 6,
  },
  itemActive: {
    backgroundColor: colors.accentSoft,
    borderColor: 'rgba(120, 86, 255, 0.38)',
  },
  label: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  labelActive: {
    color: colors.textPrimary,
  },
});
