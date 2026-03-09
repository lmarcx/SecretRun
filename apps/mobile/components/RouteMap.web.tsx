import type { LatLng } from 'react-native-maps';
import { StyleSheet, Text, View } from 'react-native';

interface RouteMapProps {
  polyline: LatLng[];
  startPoint: LatLng;
  endPoint: LatLng;
}

export function RouteMap({ polyline, startPoint, endPoint }: RouteMapProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Route Preview</Text>
      <Text style={styles.copy}>Map rendering is disabled on web for now.</Text>
      <Text style={styles.point}>
        Start: {startPoint.latitude.toFixed(4)}, {startPoint.longitude.toFixed(4)}
      </Text>
      <Text style={styles.point}>
        End: {endPoint.latitude.toFixed(4)}, {endPoint.longitude.toFixed(4)}
      </Text>
      <Text style={styles.copy}>Track points: {polyline.length}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  copy: {
    fontSize: 14,
    color: '#334155',
    textAlign: 'center',
  },
  point: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '600',
    textAlign: 'center',
  },
});
