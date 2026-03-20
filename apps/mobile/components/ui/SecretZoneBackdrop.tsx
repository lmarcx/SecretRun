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
    top: -18,
    right: -34,
    width: 210,
    height: 210,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRing: {
    position: 'absolute',
    width: 176,
    height: 176,
    borderRadius: 176,
    borderWidth: borderWidth.regular,
    borderColor: 'rgba(120, 86, 255, 0.12)',
  },
  middleRing: {
    position: 'absolute',
    width: 124,
    height: 124,
    borderRadius: 124,
    borderWidth: borderWidth.regular,
    borderColor: 'rgba(120, 86, 255, 0.18)',
  },
  innerRing: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 76,
    borderWidth: borderWidth.regular,
    borderColor: 'rgba(138, 165, 255, 0.2)',
  },
  scanSweep: {
    position: 'absolute',
    width: 150,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(120, 86, 255, 0.08)',
    transform: [{ rotate: '-36deg' }],
  },
  axisHorizontal: {
    position: 'absolute',
    width: 158,
    height: borderWidth.regular,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  axisVertical: {
    position: 'absolute',
    width: borderWidth.regular,
    height: 158,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  centerPoint: {
    width: 8,
    height: 8,
    borderRadius: 8,
    backgroundColor: colors.accent,
  },
  zonePing: {
    position: 'absolute',
    top: 58,
    right: 60,
    width: 10,
    height: 10,
    borderRadius: 10,
    borderWidth: borderWidth.regular,
    borderColor: 'rgba(83, 215, 166, 0.42)',
    backgroundColor: 'rgba(83, 215, 166, 0.16)',
  },
});
