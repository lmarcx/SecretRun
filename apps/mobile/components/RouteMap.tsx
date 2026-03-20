import { useMemo } from 'react';
import MapView, { Circle, Marker, Polyline, type LatLng, type Region } from 'react-native-maps';
import { StyleSheet, View } from 'react-native';
import { borderWidth, colors, radius } from '@/theme/tokens';

interface RouteMapProps {
  routePolyline?: LatLng[];
  userPolyline?: LatLng[];
  startPoint?: LatLng | null;
  endPoint?: LatLng | null;
  startZoneCenter?: LatLng | null;
  startZoneRadiusKm?: number;
  currentLocation?: LatLng | null;
}

function computeRegion(points: LatLng[]): Region {
  if (points.length === 0) {
    return {
      latitude: 53.3498,
      longitude: -6.2603,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
  }

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

export function RouteMap({
  routePolyline = [],
  userPolyline = [],
  startPoint,
  endPoint,
  startZoneCenter,
  startZoneRadiusKm,
  currentLocation,
}: RouteMapProps) {
  const region = useMemo(
    () =>
      computeRegion(
        [startPoint, endPoint, startZoneCenter, currentLocation]
          .filter((point): point is LatLng => Boolean(point))
          .concat(routePolyline)
          .concat(userPolyline),
      ),
    [currentLocation, endPoint, routePolyline, startPoint, startZoneCenter, userPolyline],
  );

  return (
    <View style={styles.container}>
      <MapView style={styles.map} initialRegion={region}>
        {startZoneCenter && startZoneRadiusKm ? (
          <Circle
            center={startZoneCenter}
            radius={startZoneRadiusKm * 1000}
            fillColor="rgba(120, 86, 255, 0.12)"
            strokeColor="rgba(120, 86, 255, 0.38)"
            strokeWidth={1.5}
          />
        ) : null}
        {routePolyline.length > 1 ? <Polyline coordinates={routePolyline} strokeColor={colors.accent} strokeWidth={4} /> : null}
        {userPolyline.length > 1 ? <Polyline coordinates={userPolyline} strokeColor={colors.info} strokeWidth={4} /> : null}
        {startPoint ? <Marker coordinate={startPoint} title="Start" pinColor={colors.success} /> : null}
        {endPoint ? <Marker coordinate={endPoint} title="End" pinColor={colors.danger} /> : null}
        {currentLocation ? <Marker coordinate={currentLocation} title="You" pinColor={colors.textPrimary} /> : null}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: borderWidth.regular,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  map: {
    flex: 1,
  },
});
