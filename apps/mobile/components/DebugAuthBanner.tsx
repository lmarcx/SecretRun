import { StyleSheet, Text, View } from 'react-native';
import { DEV_MODE_LABEL, getDevModeMessage, isDevRunnerActive } from '@/services/devRunnerMode';
import { nhostConfig } from '@/services/nhostClient';

export function DebugAuthBanner() {
  const devRunnerActive = isDevRunnerActive();

  return (
    <View style={styles.banner}>
      <View style={styles.row}>
        <Text style={styles.betaLabel}>Closed beta</Text>
        {devRunnerActive ? <Text style={styles.devMode}>{DEV_MODE_LABEL}</Text> : null}
      </View>
      <Text style={styles.text}>
        {devRunnerActive
          ? getDevModeMessage('global')
          : nhostConfig.isAuthEnabled
            ? 'Core event, run, leaderboard, and feed flows are active against the current local backend.'
            : 'Local auth is still unavailable. Signed-out fallback states remain active across the app.'}
      </Text>
    </View>
  );
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
  devMode: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#92400e',
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
});
