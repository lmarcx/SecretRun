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
    borderColor: 'rgba(120, 86, 255, 0.08)',
  },
  middleRing: {
    position: 'absolute',
    width: 144,
    height: 144,
    borderRadius: 124,
    borderWidth: borderWidth.regular,
    borderColor: 'rgba(120, 86, 255, 0.11)',
  },
  innerRing: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 76,
    borderWidth: borderWidth.regular,
    borderColor: 'rgba(138, 165, 255, 0.12)',
  },
  scanSweep: {
    position: 'absolute',
    width: 166,
    height: 24,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(120, 86, 255, 0.05)',
    transform: [{ rotate: '-36deg' }],
  },
  axisHorizontal: {
    position: 'absolute',
    width: 176,
    height: borderWidth.regular,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  axisVertical: {
    position: 'absolute',
    width: borderWidth.regular,
    height: 176,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  centerPoint: {
    width: 7,
    height: 7,
    borderRadius: 8,
    backgroundColor: 'rgba(120, 86, 255, 0.64)',
  },
  zonePing: {
    position: 'absolute',
    bottom: 78,
    left: 72,
    width: 9,
    height: 9,
    borderRadius: 10,
    borderWidth: borderWidth.regular,
    borderColor: 'rgba(83, 215, 166, 0.24)',
    backgroundColor: 'rgba(83, 215, 166, 0.10)',
  },
});
