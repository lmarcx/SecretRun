import { StyleSheet, View } from 'react-native';
import { borderWidth, colors, radius } from '@/theme/tokens';

export function SecretZoneBackdrop() {
  return (
    <View pointerEvents="none" style={styles.container}>
      <View style={styles.outerRing} />
      <View style={styles.middleRing} />
      <View style={styles.innerRing} />
      <View style={styles.scanSweep} />
      <View style={styles.axisHorizontal} />
      <View style={styles.axisVertical} />
      <View style={styles.centerPoint} />
      <View style={styles.zonePing} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: -34,
    right: -56,
    width: 236,
    height: 236,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRing: {
    position: 'absolute',
    width: 198,
    height: 198,
    borderRadius: 176,
    borderWidth: borderWidth.regular,
    borderColor: 'rgba(139, 92, 246, 0.13)',
  },
  middleRing: {
    position: 'absolute',
    width: 144,
    height: 144,
    borderRadius: 124,
    borderWidth: borderWidth.regular,
    borderColor: 'rgba(139, 92, 246, 0.18)',
  },
  innerRing: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 76,
    borderWidth: borderWidth.regular,
    borderColor: 'rgba(96, 165, 250, 0.20)',
  },
  scanSweep: {
    position: 'absolute',
    width: 166,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    transform: [{ rotate: '-36deg' }],
  },
  axisHorizontal: {
    position: 'absolute',
    width: 176,
    height: borderWidth.regular,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  axisVertical: {
    position: 'absolute',
    width: borderWidth.regular,
    height: 176,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  centerPoint: {
    width: 8,
    height: 8,
    borderRadius: 8,
    backgroundColor: colors.accent,
    shadowColor: colors.accentGlow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  zonePing: {
    position: 'absolute',
    bottom: 78,
    left: 72,
    width: 9,
    height: 9,
    borderRadius: 10,
    borderWidth: borderWidth.regular,
    borderColor: 'rgba(52, 211, 153, 0.32)',
    backgroundColor: 'rgba(52, 211, 153, 0.14)',
  },
});
