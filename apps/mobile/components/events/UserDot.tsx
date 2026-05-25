import { StyleSheet, View } from 'react-native';

export function UserDot() {
  return (
    <View style={styles.outer}>
      <View style={styles.pulse} />
      <View style={styles.inner} />
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulse: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(78,204,163,0.20)',
    borderWidth: 1,
    borderColor: 'rgba(78,204,163,0.35)',
  },
  inner: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: '#4ECCA3',
    borderWidth: 2,
    borderColor: '#fff',
  },
});
