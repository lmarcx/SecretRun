import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { sendTrackpoint } from '@/services/trackpoints';

export function useTrackpointSync(eventId?: string): void {
  const latestLocationRef = useRef<Location.LocationObject | null>(null);

  useEffect(() => {
    if (!eventId) {
      return;
    }

    let active = true;
    let subscription: Location.LocationSubscription | null = null;

    const start = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || !active) {
        return;
      }

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        (location) => {
          latestLocationRef.current = location;
        },
      );
    };

    void start();

    const interval = setInterval(() => {
      const location = latestLocationRef.current;
      if (!location) {
        return;
      }

      const speedMs = location.coords.speed ?? 0;
      const speedKmh = Math.max(0, speedMs * 3.6);

      void sendTrackpoint({
        eventId,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        speedKmh,
        recordedAt: new Date().toISOString(),
      });
    }, 5000);

    return () => {
      active = false;
      clearInterval(interval);
      subscription?.remove();
    };
  }, [eventId]);
}
