import { useMemo } from 'react';
import MapView, { Marker, Polyline, type LatLng, type Region } from 'react-native-maps';
import { StyleSheet, View } from 'react-native';

interface RouteMapProps {
  polyline: LatLng[];
  startPoint: LatLng;
  endPoint: LatLng;
}

function computeRegion(points: LatLng[]): Region {
  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);

  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(0.02, (maxLat - minLat) * 1.3),
    longitudeDelta: Math.max(0.02, (maxLng - minLng) * 1.3),
  };
}

export function RouteMap({ polyline, startPoint, endPoint }: RouteMapProps) {
  const region = useMemo(() => computeRegion(polyline), [polyline]);

  return (
    <View style={styles.container}>
      <MapView style={styles.map} initialRegion={region}>
        <Polyline coordinates={polyline} strokeColor="#2563eb" strokeWidth={4} />
        <Marker coordinate={startPoint} title="Start" pinColor="#16a34a" />
        <Marker coordinate={endPoint} title="End" pinColor="#dc2626" />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
});
