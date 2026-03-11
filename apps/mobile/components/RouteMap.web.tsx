import type { LatLng } from 'react-native-maps';
import { StyleSheet, Text, View } from 'react-native';

interface RouteMapProps {
  routePolyline?: LatLng[];
  userPolyline?: LatLng[];
  startPoint?: LatLng | null;
  endPoint?: LatLng | null;
  startZoneCenter?: LatLng | null;
  startZoneRadiusKm?: number;
  currentLocation?: LatLng | null;
}

export function RouteMap({
  routePolyline = [],
  userPolyline = [],
  startPoint,
  endPoint,
  startZoneCenter,
  startZoneRadiusKm,
  currentLocation,
}: RouteMapProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Route Preview</Text>
      <Text style={styles.copy}>Map rendering is disabled on web for now. Route and zone details are shown below.</Text>
      {startZoneCenter ? (
        <Text style={styles.point}>
          Start zone: {startZoneCenter.latitude.toFixed(4)}, {startZoneCenter.longitude.toFixed(4)}
          {startZoneRadiusKm ? ` (${startZoneRadiusKm.toFixed(2)} km radius)` : ''}
        </Text>
      ) : null}
      {startPoint ? (
        <Text style={styles.point}>
          Start: {startPoint.latitude.toFixed(4)}, {startPoint.longitude.toFixed(4)}
        </Text>
      ) : null}
      {endPoint ? (
        <Text style={styles.point}>
          End: {endPoint.latitude.toFixed(4)}, {endPoint.longitude.toFixed(4)}
        </Text>
      ) : null}
      {currentLocation ? (
        <Text style={styles.point}>
          You: {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
        </Text>
      ) : null}
      <Text style={styles.copy}>Route points: {routePolyline.length}</Text>
      <Text style={styles.copy}>Recorded run points: {userPolyline.length}</Text>
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
