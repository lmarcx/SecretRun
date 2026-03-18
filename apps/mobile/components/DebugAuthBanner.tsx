import { StyleSheet, Text, View } from 'react-native';
import { useAuth, type BetaAccessState } from '@/hooks/useAuth';

export function DebugAuthBanner() {
  const { betaAccessState } = useAuth();
  const bannerContent = getBannerContent(betaAccessState);

  return (
    <View style={styles.banner}>
      <View style={styles.row}>
        <Text style={styles.betaLabel}>Closed beta</Text>
        <View style={[styles.stateBadge, bannerContent.badgeStyle]}>
          <Text style={[styles.stateBadgeText, bannerContent.badgeTextStyle]}>{bannerContent.badge}</Text>
        </View>
      </View>
      <Text style={styles.text}>{bannerContent.message}</Text>
    </View>
  );
}

function getBannerContent(betaAccessState: BetaAccessState) {
  switch (betaAccessState) {
    case 'signed_in':
      return {
        badge: 'Signed in',
        badgeStyle: styles.stateBadgeSignedIn,
        badgeTextStyle: styles.stateBadgeSignedInText,
        message:
          'Signed in with a beta account. Profile sync, personal feed, team details, and supported notifications use this account.',
      };
    case 'dev_runner':
      return {
        badge: 'DEV runner',
        badgeStyle: styles.stateBadgeDev,
        badgeTextStyle: styles.stateBadgeDevText,
        message:
          'DEV runner is active for local event and run testing on this device. It does not unlock signed-in beta features.',
      };
    case 'auth_unavailable':
      return {
        badge: 'Guest only',
        badgeStyle: styles.stateBadgeGuest,
        badgeTextStyle: styles.stateBadgeGuestText,
        message:
          'Sign-in is not connected in this local environment yet. Guest browsing stays available while account features are offline.',
      };
    case 'signed_out':
      return {
        badge: 'Guest',
        badgeStyle: styles.stateBadgeGuest,
        badgeTextStyle: styles.stateBadgeGuestText,
        message:
          'Browsing without a beta account. Events and leaderboard stay open; profile sync, feed access, team details, and notifications unlock after sign-in.',
      };
    case 'loading':
    default:
      return {
        badge: 'Checking access',
        badgeStyle: styles.stateBadgeGuest,
        badgeTextStyle: styles.stateBadgeGuestText,
        message: 'Checking this device access state for the closed beta.',
      };
  }
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  betaLabel: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  text: {
    color: '#475569',
    fontSize: 12,
    lineHeight: 18,
  },
  stateBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  stateBadgeSignedIn: {
    backgroundColor: '#dcfce7',
  },
  stateBadgeSignedInText: {
    color: '#166534',
  },
  stateBadgeDev: {
    backgroundColor: '#92400e',
  },
  stateBadgeDevText: {
    color: '#ffffff',
  },
  stateBadgeGuest: {
    backgroundColor: '#e2e8f0',
  },
  stateBadgeGuestText: {
    color: '#334155',
  },
  stateBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
});
