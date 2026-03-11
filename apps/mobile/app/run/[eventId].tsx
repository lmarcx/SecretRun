import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import type { LocationObject } from 'expo-location';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { LatLng } from 'react-native-maps';
import { RouteMap } from '@/components/RouteMap';
import {
  ActivityUploadError,
  getActivityErrorMessage,
  persistCompletedRun,
  type LocalTrackpoint,
  type UploadedActivity,
} from '@/services/activitiesService';
import { fetchEventRoute } from '@/services/eventRoutes';
import { fetchEventDetails, type EventDetail } from '@/services/eventsService';
import type { EventRoute } from '@/utils/route';
import { calculatePolylineDistanceMeters, haversineDistanceMeters, isWithinRadiusKm } from '@/utils/route';

type PermissionState = 'loading' | 'granted' | 'denied' | 'error';
type RunPhase = 'ready' | 'running' | 'completed' | 'abandoned';

interface RunResult {
  status: 'completed' | 'abandoned';
  startedAt: string;
  finishedAt: string;
  durationSeconds: number;
  distanceKm: number;
  avgSpeedKmh: number;
  trackpoints: LocalTrackpoint[];
}

export default function RunScreen() {
  const router = useRouter();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const resolvedEventId = Array.isArray(eventId) ? eventId[0] : eventId;
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [route, setRoute] = useState<EventRoute | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<PermissionState>('loading');
  const [permissionMessage, setPermissionMessage] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [runPhase, setRunPhase] = useState<RunPhase>('ready');
  const [trackpoints, setTrackpoints] = useState<LocalTrackpoint[]>([]);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [result, setResult] = useState<RunResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedActivity, setUploadedActivity] = useState<UploadedActivity | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!resolvedEventId) {
        setError('Missing event id.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [nextEvent, nextRoute] = await Promise.all([fetchEventDetails(resolvedEventId), fetchEventRoute(resolvedEventId)]);
        if (!active) {
          return;
        }

        if (!nextEvent) {
          setEvent(null);
          setRoute(null);
          setError('Event not found.');
          return;
        }

        if (new Date(nextEvent.revealAt).getTime() > Date.now()) {
          setEvent(nextEvent);
          setRoute(null);
          setError('This route is not revealed yet.');
          return;
        }

        if (!nextRoute) {
          setEvent(nextEvent);
          setRoute(null);
          setError('Route details are not available yet.');
          return;
        }

        setEvent(nextEvent);
        setRoute(nextRoute);
      } catch (err) {
        if (!active) {
          return;
        }

        setError(err instanceof Error ? err.message : 'Failed to load the run.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [resolvedEventId]);

  useEffect(() => {
    let active = true;
    let subscription: Location.LocationSubscription | null = null;

    const setupLocation = async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!active) {
          return;
        }

        if (permission.status !== 'granted') {
          setPermissionState('denied');
          setPermissionMessage('Foreground location permission is required to start a run.');
          return;
        }

        setPermissionState('granted');
        setPermissionMessage(null);

        const initialLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (active) {
          setCurrentLocation(initialLocation.coords);
        }

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 2000,
            distanceInterval: 3,
          },
          (location) => {
            setCurrentLocation(location.coords);
            if (runPhase === 'running') {
              appendTrackpoint(location);
            }
          },
        );
      } catch (err) {
        if (!active) {
          return;
        }

        setPermissionState('error');
        setPermissionMessage(err instanceof Error ? err.message : 'Location is unavailable in this environment.');
      }
    };

    void setupLocation();

    return () => {
      active = false;
      subscription?.remove();
    };
  }, [runPhase]);

  useEffect(() => {
    if (runPhase !== 'running' || !startedAt) {
      return;
    }

    const interval = setInterval(() => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)));
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [runPhase, startedAt]);

  const currentLatLng: LatLng | null = currentLocation
    ? {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      }
    : null;

  const distanceToStartMeters =
    currentLatLng && event?.startAreaCenter ? haversineDistanceMeters(currentLatLng, event.startAreaCenter) : null;
  const insideStartZone =
    currentLatLng && event?.startAreaCenter ? isWithinRadiusKm(currentLatLng, event.startAreaCenter, event.startAreaRadiusKm) : false;
  const canStart = Boolean(route && event && permissionState === 'granted' && currentLatLng && insideStartZone && runPhase === 'ready');

  const liveStats = useMemo(
    () => ({
      distanceKm: Number((distanceMeters / 1000).toFixed(3)),
      avgSpeedKmh: elapsedSeconds > 0 ? Number((((distanceMeters / 1000) / elapsedSeconds) * 3600).toFixed(2)) : 0,
    }),
    [distanceMeters, elapsedSeconds],
  );

  function appendTrackpoint(location: LocationObject) {
    const nextPoint = mapLocationToTrackpoint(location);

    setTrackpoints((previous) => {
      const lastPoint = previous[previous.length - 1];
      if (lastPoint) {
        const deltaMeters = haversineDistanceMeters(
          { latitude: lastPoint.latitude, longitude: lastPoint.longitude },
          { latitude: nextPoint.latitude, longitude: nextPoint.longitude },
        );
        const deltaMs = new Date(nextPoint.recordedAt).getTime() - new Date(lastPoint.recordedAt).getTime();

        if (deltaMeters < 2 && deltaMs < 1500) {
          return previous;
        }

        setDistanceMeters((value) => value + deltaMeters);
      }

      return [...previous, nextPoint];
    });
  }

  function handleStartRun() {
    if (!currentLocation || !canStart) {
      return;
    }

    const startLocation = mapLocationToTrackpoint({
      coords: currentLocation,
      timestamp: Date.now(),
    } as LocationObject);

    setRunPhase('running');
    setTrackpoints([startLocation]);
    setDistanceMeters(0);
    setStartedAt(startLocation.recordedAt);
    setElapsedSeconds(0);
    setResult(null);
    setUploadError(null);
    setUploadedActivity(null);
  }

  function handleAbandonRun() {
    const effectiveStartedAt = startedAt ?? new Date().toISOString();
    const finishedAt = new Date().toISOString();
    const durationSeconds = Math.max(0, Math.floor((new Date(finishedAt).getTime() - new Date(effectiveStartedAt).getTime()) / 1000));

    setRunPhase('abandoned');
    setElapsedSeconds(durationSeconds);
    setResult({
      status: 'abandoned',
      startedAt: effectiveStartedAt,
      finishedAt,
      durationSeconds,
      distanceKm: Number((distanceMeters / 1000).toFixed(3)),
      avgSpeedKmh: durationSeconds > 0 ? Number((((distanceMeters / 1000) / durationSeconds) * 3600).toFixed(2)) : 0,
      trackpoints,
    });
    setUploadError('Abandoned runs are not persisted by the current MVP backend.');
  }

  async function handleFinishRun() {
    const finalPoint =
      currentLocation === null
        ? null
        : mapLocationToTrackpoint({
            coords: currentLocation,
            timestamp: Date.now(),
          } as LocationObject);
    const allTrackpoints = buildFinishedTrackpoints(trackpoints, finalPoint);
    const finishedAt = finalPoint?.recordedAt ?? new Date().toISOString();
    const effectiveStartedAt = startedAt ?? allTrackpoints[0]?.recordedAt ?? new Date().toISOString();
    const totalDistanceMeters = calculatePolylineDistanceMeters(
      allTrackpoints.map((point) => ({
        latitude: point.latitude,
        longitude: point.longitude,
      })),
    );
    const durationSeconds = Math.max(0, Math.floor((new Date(finishedAt).getTime() - new Date(effectiveStartedAt).getTime()) / 1000));
    const nextResult: RunResult = {
      status: 'completed',
      startedAt: effectiveStartedAt,
      finishedAt,
      durationSeconds,
      distanceKm: Number((totalDistanceMeters / 1000).toFixed(3)),
      avgSpeedKmh: durationSeconds > 0 ? Number((((totalDistanceMeters / 1000) / durationSeconds) * 3600).toFixed(2)) : 0,
      trackpoints: allTrackpoints,
    };

    setRunPhase('completed');
    setTrackpoints(allTrackpoints);
    setDistanceMeters(totalDistanceMeters);
    setElapsedSeconds(durationSeconds);
    setResult(nextResult);
    setUploadError(null);
    setUploadedActivity(null);

    await persistResult(nextResult, null);
  }

  async function persistResult(nextResult: RunResult, existingActivity: UploadedActivity | null) {
    if (!resolvedEventId) {
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const activity = await persistCompletedRun({
        eventId: resolvedEventId,
        startedAt: nextResult.startedAt,
        finishedAt: nextResult.finishedAt,
        durationSeconds: nextResult.durationSeconds,
        distanceKm: nextResult.distanceKm,
        avgSpeedKmh: nextResult.avgSpeedKmh,
        trackpoints: nextResult.trackpoints,
        existingActivity,
      });

      setUploadedActivity(activity);
    } catch (err) {
      setUploadError(getActivityErrorMessage(err));
      if (err instanceof ActivityUploadError && err.activity) {
        setUploadedActivity(err.activity);
      }
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.info}>Loading run...</Text>
      </SafeAreaView>
    );
  }

  if (error || !event || !route) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.title}>Run</Text>
        <Text style={styles.error}>{error ?? 'No route available.'}</Text>
        <Pressable style={styles.secondaryButton} onPress={() => router.replace(`/events/${resolvedEventId ?? ''}`)}>
          <Text style={styles.secondaryButtonText}>Back to event</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Run</Text>
          <Text style={styles.subtitle}>{event.title}</Text>
        </View>

        <View style={styles.mapWrapper}>
          <RouteMap
            routePolyline={route.polyline}
            userPolyline={trackpoints.map((point) => ({ latitude: point.latitude, longitude: point.longitude }))}
            startPoint={route.startPoint}
            endPoint={route.endPoint}
            startZoneCenter={event.startAreaCenter}
            startZoneRadiusKm={event.startAreaRadiusKm}
            currentLocation={currentLatLng}
          />
        </View>

        <View style={styles.statsGrid}>
          <StatCard label="Timer" value={formatDuration(runPhase === 'running' ? elapsedSeconds : result?.durationSeconds ?? elapsedSeconds)} />
          <StatCard label="Distance" value={`${(runPhase === 'running' ? liveStats.distanceKm : result?.distanceKm ?? liveStats.distanceKm).toFixed(3)} km`} />
          <StatCard label="Avg speed" value={`${(runPhase === 'running' ? liveStats.avgSpeedKmh : result?.avgSpeedKmh ?? liveStats.avgSpeedKmh).toFixed(2)} km/h`} />
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Location status</Text>
          {permissionState === 'loading' ? <Text style={styles.info}>Requesting location permission...</Text> : null}
          {permissionMessage ? <Text style={styles.warning}>{permissionMessage}</Text> : null}
          {currentLatLng ? (
            <Text style={styles.info}>
              Current location: {currentLatLng.latitude.toFixed(5)}, {currentLatLng.longitude.toFixed(5)}
            </Text>
          ) : (
            <Text style={styles.info}>Current location is not available yet.</Text>
          )}
          {distanceToStartMeters !== null ? (
            <Text style={insideStartZone ? styles.success : styles.warning}>
              {insideStartZone
                ? 'You are inside the start zone and can begin.'
                : `You are ${Math.round(distanceToStartMeters)} m away from the start zone.`}
            </Text>
          ) : (
            <Text style={styles.info}>Move near the start zone to unlock the run.</Text>
          )}
        </View>

        {runPhase === 'ready' ? (
          <Pressable style={[styles.primaryButton, !canStart && styles.buttonDisabled]} onPress={handleStartRun} disabled={!canStart}>
            <Text style={styles.primaryButtonText}>
              {permissionState !== 'granted' ? 'Location required' : !insideStartZone ? 'Move into start zone' : 'Start run'}
            </Text>
          </Pressable>
        ) : null}

        {runPhase === 'running' ? (
          <View style={styles.actionRow}>
            <Pressable style={styles.secondaryButton} onPress={handleAbandonRun}>
              <Text style={styles.secondaryButtonText}>Abandon</Text>
            </Pressable>
            <Pressable style={styles.primaryButton} onPress={() => void handleFinishRun()}>
              <Text style={styles.primaryButtonText}>Finish</Text>
            </Pressable>
          </View>
        ) : null}

        {result ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Run result</Text>
            <Text style={result.status === 'completed' ? styles.success : styles.warning}>
              Status: {result.status === 'completed' ? 'Completed' : 'Abandoned'}
            </Text>
            <Text style={styles.info}>Duration: {formatDuration(result.durationSeconds)}</Text>
            <Text style={styles.info}>Distance: {result.distanceKm.toFixed(3)} km</Text>
            <Text style={styles.info}>Average speed: {result.avgSpeedKmh.toFixed(2)} km/h</Text>
            <Text style={styles.info}>Points: {uploadedActivity ? uploadedActivity.points : 'Unavailable'}</Text>

            {uploading ? <Text style={styles.info}>Uploading activity...</Text> : null}
            {!uploading && !uploadError && result.status === 'completed' ? (
              <Text style={styles.success}>Finish success. Activity upload completed.</Text>
            ) : null}
            {uploadError ? <Text style={styles.error}>Upload failed: {uploadError}</Text> : null}

            {result.status === 'completed' && uploadError ? (
              <Pressable style={styles.secondaryButton} onPress={() => void persistResult(result, uploadedActivity)}>
                <Text style={styles.secondaryButtonText}>Retry upload</Text>
              </Pressable>
            ) : null}

            <Pressable style={styles.secondaryButton} onPress={() => router.replace(`/events/${event.id}`)}>
              <Text style={styles.secondaryButtonText}>Back to event</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function mapLocationToTrackpoint(location: LocationObject): LocalTrackpoint {
  const speedMs = location.coords.speed ?? 0;

  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    recordedAt: new Date(location.timestamp ?? Date.now()).toISOString(),
    speedKmh: Number(Math.max(0, speedMs * 3.6).toFixed(2)),
  };
}

function buildFinishedTrackpoints(trackpoints: LocalTrackpoint[], finalPoint: LocalTrackpoint | null): LocalTrackpoint[] {
  if (!finalPoint) {
    return trackpoints;
  }

  const lastPoint = trackpoints[trackpoints.length - 1];
  if (
    lastPoint &&
    lastPoint.latitude === finalPoint.latitude &&
    lastPoint.longitude === finalPoint.longitude &&
    lastPoint.recordedAt === finalPoint.recordedAt
  ) {
    return trackpoints;
  }

  return [...trackpoints, finalPoint];
}

function formatDuration(durationSeconds: number): string {
  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);
  const seconds = durationSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
    gap: 14,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 16,
    gap: 8,
  },
  header: {
    gap: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 16,
    color: '#475569',
  },
  info: {
    color: '#334155',
  },
  warning: {
    color: '#9a3412',
    fontWeight: '600',
  },
  success: {
    color: '#166534',
    fontWeight: '600',
  },
  error: {
    color: '#b91c1c',
    fontWeight: '600',
    textAlign: 'center',
  },
  mapWrapper: {
    height: 280,
    borderRadius: 14,
    overflow: 'hidden',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 14,
    gap: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  statValue: {
    fontSize: 18,
    color: '#0f172a',
    fontWeight: '700',
  },
  infoCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 16,
    gap: 8,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  buttonDisabled: {
    backgroundColor: '#94a3b8',
  },
  resultCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 16,
    gap: 10,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
});
