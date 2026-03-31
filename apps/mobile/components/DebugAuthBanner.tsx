import { StyleSheet, Text, View } from 'react-native';
import { getBetaBuildLabel } from '@/services/betaDiagnostics';
import { getBackendApiSourceDiagnostics } from '@/services/backendApiClient';
import { useAuth, type BetaAccessState } from '@/hooks/useAuth';
import { getAuthSourceDiagnostics, getGraphqlSourceDiagnostics } from '@/services/nhostClient';
import { borderWidth, colors, spacing, typography } from '@/theme/tokens';

export function DebugAuthBanner() {
  const { betaAccessState } = useAuth();
  const bannerContent = getBannerContent(betaAccessState);
  const authSource = getAuthSourceDiagnostics();
  const graphqlSource = getGraphqlSourceDiagnostics();
  const backendSource = getBackendApiSourceDiagnostics();

  return (
    <View style={styles.banner}>
      <View style={styles.row}>
        <Text style={styles.betaLabel}>Closed beta</Text>
        <View style={[styles.stateBadge, bannerContent.badgeStyle]}>
          <Text style={[styles.stateBadgeText, bannerContent.badgeTextStyle]}>{bannerContent.badge}</Text>
        </View>
        <Text style={styles.buildLabel}>{getBetaBuildLabel()}</Text>
      </View>
      <Text style={styles.text}>{bannerContent.message}</Text>
      <Text style={styles.sourceText}>
        {`Auth ${formatSourceLabel(authSource.mode)} | GraphQL ${formatSourceLabel(graphqlSource.mode)} (${graphqlSource.via}) | Backend ${formatSourceLabel(backendSource.mode)}`}
      </Text>
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
    case 'beta_blocked':
      return {
        badge: 'Blocked',
        badgeStyle: styles.stateBadgeDev,
        badgeTextStyle: styles.stateBadgeDevText,
        message:
          'This device is using an account without closed beta access. Sign in with an invited email or use local DEV runner mode.',
      };
    case 'signed_out':
      return {
        badge: 'Sign in required',
        badgeStyle: styles.stateBadgeGuest,
        badgeTextStyle: styles.stateBadgeGuestText,
        message:
          'This closed beta now requires an invited account before entering the app outside local DEV runner mode.',
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

function formatSourceLabel(mode: 'local' | 'cloud' | 'custom' | 'unset') {
  switch (mode) {
    case 'local':
      return 'local';
    case 'cloud':
      return 'cloud';
    case 'custom':
      return 'custom';
    case 'unset':
    default:
      return 'unset';
  }
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.backgroundRaised,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: borderWidth.regular,
    borderBottomColor: colors.border,
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  betaLabel: {
    ...typography.eyebrow,
    color: colors.textMuted,
  },
  text: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  sourceText: {
    ...typography.bodySm,
    color: colors.textMuted,
  },
  buildLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  stateBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: borderWidth.regular,
  },
  stateBadgeSignedIn: {
    backgroundColor: colors.successSoft,
    borderColor: 'rgba(83, 215, 166, 0.24)',
  },
  stateBadgeSignedInText: {
    color: colors.success,
  },
  stateBadgeDev: {
    backgroundColor: colors.warningSoft,
    borderColor: 'rgba(242, 181, 93, 0.24)',
  },
  stateBadgeDevText: {
    color: colors.warning,
  },
  stateBadgeGuest: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.borderStrong,
  },
  stateBadgeGuestText: {
    color: colors.textSecondary,
  },
  stateBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
});
