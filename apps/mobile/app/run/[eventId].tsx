import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import type { LocationObject } from 'expo-location';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { LatLng } from 'react-native-maps';
import { RouteMap } from '@/components/RouteMap';
import {
  ActivityUploadError,
  getActivityErrorMessage,
  persistCompletedRun,
  type LocalTrackpoint,
  type UploadedActivity,
} from '@/services/activitiesService';
import { DEV_MODE_LABEL, getDevModeMessage, isDevRunnerActive } from '@/services/devRunnerMode';
import { canFetchProtectedEventRoute, fetchEventRoute } from '@/services/eventRoutes';
import { fetchEventDetails, type EventDetail } from '@/services/eventsService';
import { getStoredRunSession, setStoredRunSession } from '@/services/runSessionStore';
import type { EventRoute } from '@/utils/route';
import { haversineDistanceMeters, isWithinRadiusKm } from '@/utils/route';

type PermissionState = 'loading' | 'granted' | 'denied' | 'error';
type RunPhase = 'ready' | 'running' | 'completed' | 'abandoned' | 'invalid';
type ResultStatus = 'completed' | 'abandoned' | 'invalid';

interface RunResult {
  status: ResultStatus;
  startedAt: string;
  finishedAt: string;
  durationSeconds: number;
  distanceKm: number;
  avgSpeedKmh: number;
  trackpoints: LocalTrackpoint[];
}

interface TrackpointDecision {
  accept: boolean;
  distanceDeltaMeters: number;
  message: string | null;
  suspiciousWarning: string | null;
}

const RUN_ACCESS_DENIED_MESSAGE =
  'Join this event before starting a run. Revealed routes are available only to participants.';
const MAX_STALE_FIX_MS = 15000;
const MAX_ACCURACY_METERS = 80;
const MIN_DUPLICATE_DISTANCE_METERS = 2;
const MIN_DUPLICATE_WINDOW_MS = 1500;
const MAX_SEGMENT_SPEED_KMH = 30;
const MAX_JUMP_METERS = 250;
const MAX_JUMP_WINDOW_MS = 10000;
const MIN_RUN_DURATION_SECONDS = 60;
const MIN_RUN_DISTANCE_METERS = 250;

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
  const [gpsQualityMessage, setGpsQualityMessage] = useState<string | null>(null);
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
  const [suspiciousWarning, setSuspiciousWarning] = useState<string | null>(null);
  const [finishWarning, setFinishWarning] = useState<string | null>(null);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(null);
  const devRunnerActive = isDevRunnerActive();
  const isWeb = Platform.OS === 'web';
  const hasRedirectedRef = useRef(false);
  const trackpointsRef = useRef<LocalTrackpoint[]>([]);
  const distanceMetersRef = useRef(0);
  const startedAtRef = useRef<string | null>(null);
  const uploadedActivityRef = useRef<UploadedActivity | null>(null);
  const suspiciousWarningRef = useRef<string | null>(null);

  useEffect(() => {
    trackpointsRef.current = trackpoints;
  }, [trackpoints]);

  useEffect(() => {
    distanceMetersRef.current = distanceMeters;
  }, [distanceMeters]);

  useEffect(() => {
    startedAtRef.current = startedAt;
  }, [startedAt]);

  useEffect(() => {
    uploadedActivityRef.current = uploadedActivity;
  }, [uploadedActivity]);

  useEffect(() => {
    suspiciousWarningRef.current = suspiciousWarning;
  }, [suspiciousWarning]);

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
      setAccessDeniedMessage(null);

      try {
        const nextEvent = await fetchEventDetails(resolvedEventId);
        if (!active) {
          return;
        }

        if (!nextEvent) {
          setEvent(null);
          setRoute(null);
          setError('Event not found.');
          return;
        }

        const canAccessRun = devRunnerActive || nextEvent.viewerParticipationStatus === 'registered';
        if (!canAccessRun) {
          setEvent(nextEvent);
          setRoute(null);
          setAccessDeniedMessage(RUN_ACCESS_DENIED_MESSAGE);
          return;
        }

        if (!devRunnerActive && new Date(nextEvent.revealAt).getTime() > Date.now()) {
          setEvent(nextEvent);
          setRoute(null);
          setError('This route is not revealed yet.');
          return;
        }

        const canRequestBackendRoute = canFetchProtectedEventRoute(nextEvent.viewerParticipationStatus);
        const nextRoute = canRequestBackendRoute
          ? await fetchEventRoute(resolvedEventId, {
              allowRequest: canRequestBackendRoute,
            })
          : null;
        if (!active) {
          return;
        }

        const fallbackRoute =
          !nextRoute && devRunnerActive && nextEvent.startAreaCenter ? createDevRoute(nextEvent.startAreaCenter) : null;
        const resolvedRoute = nextRoute ?? fallbackRoute;

        if (!resolvedRoute) {
          setEvent(nextEvent);
          setRoute(null);
          setError('Route details are not available yet.');
          return;
        }

        const storedRunSession = getStoredRunSession(resolvedEventId);
        setEvent(nextEvent);
        setRoute(resolvedRoute);

        if (storedRunSession?.phase === 'running' && storedRunSession.draft) {
          trackpointsRef.current = storedRunSession.draft.trackpoints;
          distanceMetersRef.current = storedRunSession.draft.distanceMeters;
          startedAtRef.current = storedRunSession.draft.startedAt;
          uploadedActivityRef.current = storedRunSession.draft.activity;
          suspiciousWarningRef.current = storedRunSession.draft.suspiciousWarning;
          setRunPhase('running');
          setTrackpoints(storedRunSession.draft.trackpoints);
          setDistanceMeters(storedRunSession.draft.distanceMeters);
          setStartedAt(storedRunSession.draft.startedAt);
          setElapsedSeconds(
            Math.max(0, Math.floor((Date.now() - new Date(storedRunSession.draft.startedAt).getTime()) / 1000)),
          );
          setUploadedActivity(storedRunSession.draft.activity);
          setSuspiciousWarning(storedRunSession.draft.suspiciousWarning);
          setFinishWarning('Recovered an active run from local session state on this device.');
          setUploadError(storedRunSession.uploadError);
          setResult(null);
          return;
        }

        if (storedRunSession?.result) {
          trackpointsRef.current = storedRunSession.result.trackpoints;
          distanceMetersRef.current = storedRunSession.result.distanceKm * 1000;
          startedAtRef.current = storedRunSession.result.startedAt;
          uploadedActivityRef.current = storedRunSession.uploadedActivity;
          setResult(storedRunSession.result);
          setRunPhase(storedRunSession.phase);
          setElapsedSeconds(storedRunSession.result.durationSeconds);
          setDistanceMeters(storedRunSession.result.distanceKm * 1000);
          setTrackpoints(storedRunSession.result.trackpoints);
          setStartedAt(storedRunSession.result.startedAt);
          setUploadedActivity(storedRunSession.uploadedActivity);
          setUploadError(storedRunSession.uploadError);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load the run.');
        }
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
  }, [devRunnerActive, resolvedEventId]);

  useEffect(() => {
    if (!accessDeniedMessage || hasRedirectedRef.current) {
      return;
    }

    hasRedirectedRef.current = true;
    if (resolvedEventId) {
      router.replace({ pathname: '/events/[id]', params: { id: resolvedEventId, notice: accessDeniedMessage } });
      return;
    }

    router.replace('/events');
  }, [accessDeniedMessage, resolvedEventId, router]);

  useEffect(() => {
    let active = true;
    let subscription: Location.LocationSubscription | { remove?: () => void } | null = null;

    const setupLocation = async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!active) {
          return;
        }

        if (permission.status !== 'granted') {
          setPermissionState('denied');
          setPermissionMessage('Location access is required to start a run.');
          return;
        }

        setPermissionState('granted');
        setPermissionMessage(null);

        const initialLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (active) {
          setCurrentLocation(initialLocation.coords);
        }

        if (isWeb) {
          setPermissionMessage('Live GPS tracking is only available on mobile. Web stays in a limited beta preview.');
          return;
        }

        subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 2000, distanceInterval: 3 },
          (location) => {
            setCurrentLocation(location.coords);
            if (runPhase === 'running') {
              appendTrackpoint(location);
            }
          },
        );
      } catch (err) {
        if (active) {
          setPermissionState('error');
          setPermissionMessage(err instanceof Error ? err.message : 'Location is unavailable in this environment.');
        }
      }
    };

    void setupLocation();

    return () => {
      active = false;
      if (subscription && typeof subscription.remove === 'function') {
        subscription.remove();
      }
    };
  }, [isWeb, runPhase]);

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
    ? { latitude: currentLocation.latitude, longitude: currentLocation.longitude }
    : null;
  const distanceToStartMeters =
    currentLatLng && event?.startAreaCenter ? haversineDistanceMeters(currentLatLng, event.startAreaCenter) : null;
  const insideStartZone =
    currentLatLng && event?.startAreaCenter
      ? isWithinRadiusKm(currentLatLng, event.startAreaCenter, event.startAreaRadiusKm)
      : false;
  const canStart = Boolean(
    route &&
      event &&
      permissionState === 'granted' &&
      (currentLatLng || (isWeb && devRunnerActive)) &&
      (insideStartZone || devRunnerActive) &&
      runPhase === 'ready',
  );

  const liveStats = useMemo(
    () => ({
      distanceKm: Number((distanceMeters / 1000).toFixed(3)),
      avgSpeedKmh:
        elapsedSeconds > 0 ? Number((((distanceMeters / 1000) / elapsedSeconds) * 3600).toFixed(2)) : 0,
    }),
    [distanceMeters, elapsedSeconds],
  );

  const runStatusText =
    runPhase === 'running'
      ? 'Tracking is active on this device. Weak or impossible GPS points are filtered before upload.'
      : runPhase === 'completed'
        ? uploadError
          ? 'Your local result is saved. Sync still needs attention.'
          : uploadedActivity?.status === 'rejected'
            ? 'Your run finished locally, but review flagged it for follow-up.'
            : 'Your run is complete and has synced successfully.'
        : runPhase === 'abandoned'
          ? 'This run was abandoned and kept locally for review.'
          : runPhase === 'invalid'
            ? 'This run was not accepted as a valid completion.'
            : 'Move into the start zone, review the route, and begin when ready.';

  function persistRunningDraft(nextTrackpoints: LocalTrackpoint[], nextDistanceMeters: number, nextStartedAt: string) {
    if (!resolvedEventId) {
      return;
    }

    setStoredRunSession(resolvedEventId, {
      phase: 'running',
      draft: {
        startedAt: nextStartedAt,
        distanceMeters: nextDistanceMeters,
        trackpoints: nextTrackpoints,
        activity: uploadedActivityRef.current,
        suspiciousWarning: suspiciousWarningRef.current,
      },
      result: null,
      uploadedActivity: uploadedActivityRef.current,
      uploadError: null,
    });
  }

  function saveSuspiciousWarning(message: string | null) {
    if (!message) {
      return;
    }

    suspiciousWarningRef.current = message;
    setSuspiciousWarning((previous) => previous ?? message);
  }

  function appendTrackpoint(location: LocationObject) {
    const nextPoint = mapLocationToTrackpoint(location);
    const previousPoint = trackpointsRef.current[trackpointsRef.current.length - 1] ?? null;
    const decision = evaluateTrackpoint(previousPoint, nextPoint);

    if (!decision.accept) {
      setGpsQualityMessage(decision.message);
      saveSuspiciousWarning(decision.suspiciousWarning);
      return;
    }

    const nextTrackpoints = [...trackpointsRef.current, nextPoint];
    const nextDistanceMeters = distanceMetersRef.current + decision.distanceDeltaMeters;
    const nextStartedAt = startedAtRef.current ?? nextPoint.recordedAt;

    trackpointsRef.current = nextTrackpoints;
    distanceMetersRef.current = nextDistanceMeters;
    startedAtRef.current = nextStartedAt;

    setTrackpoints(nextTrackpoints);
    setDistanceMeters(nextDistanceMeters);
    setStartedAt(nextStartedAt);
    setElapsedSeconds(Math.max(0, Math.floor((Date.now() - new Date(nextStartedAt).getTime()) / 1000)));
    setGpsQualityMessage(null);
    saveSuspiciousWarning(decision.suspiciousWarning);
    persistRunningDraft(nextTrackpoints, nextDistanceMeters, nextStartedAt);
  }

  function handleStartRun() {
    if (!canStart) {
      return;
    }

    const startLocation = currentLocation
      ? mapLocationToTrackpoint({ coords: currentLocation, timestamp: Date.now() } as LocationObject)
      : createFallbackTrackpoint(route?.startPoint ?? event?.startAreaCenter ?? null);

    trackpointsRef.current = [startLocation];
    distanceMetersRef.current = 0;
    startedAtRef.current = startLocation.recordedAt;
    uploadedActivityRef.current = null;
    suspiciousWarningRef.current = null;

    setRunPhase('running');
    setTrackpoints([startLocation]);
    setDistanceMeters(0);
    setStartedAt(startLocation.recordedAt);
    setElapsedSeconds(0);
    setResult(null);
    setUploadError(null);
    setUploadedActivity(null);
    setSuspiciousWarning(null);
    setGpsQualityMessage(null);
    setFinishWarning(null);
    persistRunningDraft([startLocation], 0, startLocation.recordedAt);
  }

  function handleAbandonRun() {
    const effectiveStartedAt = startedAtRef.current ?? new Date().toISOString();
    const finishedAt = new Date().toISOString();
    const durationSeconds = Math.max(
      0,
      Math.floor((new Date(finishedAt).getTime() - new Date(effectiveStartedAt).getTime()) / 1000),
    );
    const nextResult = buildRunResult(
      'abandoned',
      effectiveStartedAt,
      finishedAt,
      durationSeconds,
      distanceMetersRef.current,
      trackpointsRef.current,
    );

    setRunPhase('abandoned');
    setElapsedSeconds(durationSeconds);
    setResult(nextResult);
    setFinishWarning('Abandoned runs stay on this device and are not synced.');
    setUploadError('Abandoned runs are not synced.');

    if (resolvedEventId) {
      setStoredRunSession(resolvedEventId, {
        phase: 'abandoned',
        draft: null,
        result: nextResult,
        uploadedActivity: null,
        uploadError: 'Abandoned runs are not synced.',
      });
    }
  }

  async function handleFinishRun() {
    setFinishWarning(null);

    const finalPoint =
      currentLocation === null
        ? isWeb
          ? createFallbackTrackpoint(route?.endPoint ?? route?.startPoint ?? event?.startAreaCenter ?? null)
          : null
        : mapLocationToTrackpoint({ coords: currentLocation, timestamp: Date.now() } as LocationObject);

    let allTrackpoints = trackpointsRef.current;
    let totalDistanceMeters = distanceMetersRef.current;

    if (finalPoint) {
      const decision = evaluateTrackpoint(trackpointsRef.current[trackpointsRef.current.length - 1] ?? null, finalPoint);
      if (decision.accept) {
        allTrackpoints = [...trackpointsRef.current, finalPoint];
        totalDistanceMeters += decision.distanceDeltaMeters;
      } else if (decision.message) {
        setGpsQualityMessage(decision.message);
        saveSuspiciousWarning(decision.suspiciousWarning);
      }
    }

    const finishedAt = allTrackpoints[allTrackpoints.length - 1]?.recordedAt ?? new Date().toISOString();
    const effectiveStartedAt = startedAtRef.current ?? allTrackpoints[0]?.recordedAt ?? new Date().toISOString();
    const durationSeconds = Math.max(
      0,
      Math.floor((new Date(finishedAt).getTime() - new Date(effectiveStartedAt).getTime()) / 1000),
    );

    if (allTrackpoints.length < 2) {
      finalizeInvalidRun(
        buildRunResult('invalid', effectiveStartedAt, finishedAt, durationSeconds, totalDistanceMeters, allTrackpoints),
        'We need more stable GPS samples before this run can be completed.',
      );
      return;
    }

    if (durationSeconds < MIN_RUN_DURATION_SECONDS) {
      finalizeInvalidRun(
        buildRunResult('invalid', effectiveStartedAt, finishedAt, durationSeconds, totalDistanceMeters, allTrackpoints),
        `Run too short. Keep moving for at least ${MIN_RUN_DURATION_SECONDS} seconds before finishing.`,
      );
      return;
    }

    if (totalDistanceMeters < MIN_RUN_DISTANCE_METERS) {
      finalizeInvalidRun(
        buildRunResult('invalid', effectiveStartedAt, finishedAt, durationSeconds, totalDistanceMeters, allTrackpoints),
        `Run too short. Cover at least ${(MIN_RUN_DISTANCE_METERS / 1000).toFixed(2)} km before finishing.`,
      );
      return;
    }

    const nextResult = buildRunResult(
      'completed',
      effectiveStartedAt,
      finishedAt,
      durationSeconds,
      totalDistanceMeters,
      allTrackpoints,
    );

    trackpointsRef.current = allTrackpoints;
    distanceMetersRef.current = totalDistanceMeters;

    setRunPhase('completed');
    setTrackpoints(allTrackpoints);
    setDistanceMeters(totalDistanceMeters);
    setElapsedSeconds(durationSeconds);
    setResult(nextResult);
    setUploadError(null);
    setGpsQualityMessage(null);

    if (resolvedEventId) {
      setStoredRunSession(resolvedEventId, {
        phase: 'completed',
        draft: null,
        result: nextResult,
        uploadedActivity: uploadedActivityRef.current,
        uploadError: null,
      });
    }

    await persistResult(nextResult, uploadedActivityRef.current);
  }

  function finalizeInvalidRun(nextResult: RunResult, message: string) {
    trackpointsRef.current = nextResult.trackpoints;
    distanceMetersRef.current = nextResult.distanceKm * 1000;
    startedAtRef.current = nextResult.startedAt;

    setRunPhase('invalid');
    setTrackpoints(nextResult.trackpoints);
    setDistanceMeters(nextResult.distanceKm * 1000);
    setElapsedSeconds(nextResult.durationSeconds);
    setResult(nextResult);
    setUploadError(message);
    setFinishWarning(message);
    setUploading(false);

    if (resolvedEventId) {
      setStoredRunSession(resolvedEventId, {
        phase: 'invalid',
        draft: null,
        result: nextResult,
        uploadedActivity: null,
        uploadError: message,
      });
    }
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

      uploadedActivityRef.current = activity;
      setUploadedActivity(activity);
      setFinishWarning(
        activity.status === 'rejected'
          ? 'This run was flagged during review and was not scored.'
          : suspiciousWarningRef.current
            ? 'This run was uploaded, but some GPS samples looked suspicious and may still be reviewed.'
            : null,
      );

      setStoredRunSession(resolvedEventId, {
        phase: 'completed',
        draft: null,
        result: nextResult,
        uploadedActivity: activity,
        uploadError: null,
      });
    } catch (err) {
      const nextUploadError = getActivityErrorMessage(err);
      setUploadError(nextUploadError);
      setFinishWarning('Your result is saved on this device. Retry sync when the service is available again.');

      if (err instanceof ActivityUploadError && err.activity) {
        uploadedActivityRef.current = err.activity;
        setUploadedActivity(err.activity);
      }

      setStoredRunSession(resolvedEventId, {
        phase: 'completed',
        draft: null,
        result: nextResult,
        uploadedActivity: err instanceof ActivityUploadError ? err.activity : null,
        uploadError: nextUploadError,
      });
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

  if (accessDeniedMessage) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.title}>Run</Text>
        <Text style={styles.warning}>{accessDeniedMessage}</Text>
        <Text style={styles.info}>Redirecting you back to the event details.</Text>
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

        {devRunnerActive ? (
          <View style={styles.devModeCard}>
            <Text style={styles.devModeTitle}>{DEV_MODE_LABEL}</Text>
            <Text style={styles.info}>{getDevModeMessage('run')}</Text>
          </View>
        ) : null}

        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Run status</Text>
          <Text style={styles.statusValue}>{formatRunPhase(runPhase)}</Text>
          <Text style={styles.info}>{runStatusText}</Text>
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
          <StatCard
            label="Timer"
            value={formatDuration(runPhase === 'running' ? elapsedSeconds : result?.durationSeconds ?? elapsedSeconds)}
          />
          <StatCard
            label="Distance"
            value={`${(runPhase === 'running' ? liveStats.distanceKm : result?.distanceKm ?? liveStats.distanceKm).toFixed(3)} km`}
          />
          <StatCard
            label="Avg speed"
            value={`${(runPhase === 'running' ? liveStats.avgSpeedKmh : result?.avgSpeedKmh ?? liveStats.avgSpeedKmh).toFixed(2)} km/h`}
          />
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Location and tracking</Text>
          {permissionState === 'loading' ? <Text style={styles.info}>Requesting location permission...</Text> : null}
          {permissionMessage ? <Text style={styles.warning}>{permissionMessage}</Text> : null}
          {gpsQualityMessage ? <Text style={styles.warning}>{gpsQualityMessage}</Text> : null}
          {suspiciousWarning ? <Text style={styles.warning}>{suspiciousWarning}</Text> : null}
          {finishWarning ? <Text style={styles.info}>{finishWarning}</Text> : null}
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
          {runPhase === 'running' ? (
            <Text style={styles.success}>Tracking active: accepted GPS samples are updating locally.</Text>
          ) : null}
          {isWeb ? <Text style={styles.info}>Live GPS tracking is only available on mobile. Web stays in a limited beta preview.</Text> : null}
          {devRunnerActive && !insideStartZone ? <Text style={styles.warning}>DEV runner: start zone check bypassed</Text> : null}
        </View>

        {runPhase === 'ready' ? (
          <Pressable style={[styles.primaryButton, !canStart && styles.buttonDisabled]} onPress={handleStartRun} disabled={!canStart}>
            <Text style={styles.primaryButtonText}>Start Run</Text>
          </Pressable>
        ) : null}

        {runPhase === 'running' ? (
          <View style={styles.controlsCard}>
            <Text style={styles.controlsTitle}>Active run controls</Text>
            <Text style={styles.info}>
              Finish when you are done. Runs shorter than {(MIN_RUN_DISTANCE_METERS / 1000).toFixed(2)} km or under {MIN_RUN_DURATION_SECONDS} seconds stay invalid and local only.
            </Text>
            <View style={styles.actionRow}>
              <Pressable style={styles.secondaryButton} onPress={handleAbandonRun}>
                <Text style={styles.secondaryButtonText}>Abandon Run</Text>
              </Pressable>
              <Pressable style={styles.primaryButton} onPress={() => void handleFinishRun()}>
                <Text style={styles.primaryButtonText}>Finish Run</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {result ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Run result</Text>
            <Text style={result.status === 'completed' ? styles.success : result.status === 'invalid' ? styles.error : styles.warning}>
              Status: {formatResultStatus(result.status)}
            </Text>
            <View style={styles.resultStats}>
              <ResultMetric label="Duration" value={formatDuration(result.durationSeconds)} />
              <ResultMetric label="Distance" value={`${result.distanceKm.toFixed(3)} km`} />
              <ResultMetric label="Average speed" value={`${result.avgSpeedKmh.toFixed(2)} km/h`} />
              <ResultMetric label="Activity points" value={uploadedActivity ? String(uploadedActivity.points) : 'Unavailable'} />
            </View>
            <Text style={styles.info}>Season leaderboard totals update after review and scoring finish.</Text>
            {uploading ? <Text style={styles.info}>Uploading activity...</Text> : null}
            {!uploading && result.status === 'completed' && !uploadError && uploadedActivity?.status !== 'rejected' ? (
              <Text style={styles.success}>Run saved and synced.</Text>
            ) : null}
            {uploadedActivity?.status === 'rejected' ? <Text style={styles.warning}>Run review flagged this attempt. It was not scored.</Text> : null}
            {uploadError ? <Text style={styles.error}>Sync issue: {uploadError}</Text> : null}
            {result.status === 'completed' && uploadError ? (
              <Pressable style={styles.secondaryButton} onPress={() => void persistResult(result, uploadedActivityRef.current)}>
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

function ResultMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.resultMetric}>
      <Text style={styles.resultMetricLabel}>{label}</Text>
      <Text style={styles.resultMetricValue}>{value}</Text>
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
    accuracyMeters: location.coords.accuracy ?? null,
  };
}

function createFallbackTrackpoint(point: LatLng | null): LocalTrackpoint {
  const fallbackPoint = point ?? { latitude: 53.3498, longitude: -6.2603 };

  return {
    latitude: fallbackPoint.latitude,
    longitude: fallbackPoint.longitude,
    recordedAt: new Date().toISOString(),
    speedKmh: 0,
    accuracyMeters: null,
  };
}

function evaluateTrackpoint(previousPoint: LocalTrackpoint | null, nextPoint: LocalTrackpoint): TrackpointDecision {
  const recordedAtMs = new Date(nextPoint.recordedAt).getTime();
  if (Number.isNaN(recordedAtMs)) {
    return {
      accept: false,
      distanceDeltaMeters: 0,
      message: 'Ignoring a GPS fix with an invalid timestamp.',
      suspiciousWarning: 'Some GPS samples looked inconsistent during this run.',
    };
  }

  if (Date.now() - recordedAtMs > MAX_STALE_FIX_MS) {
    return {
      accept: false,
      distanceDeltaMeters: 0,
      message: 'Weak GPS signal. Waiting for a fresher location fix.',
      suspiciousWarning: null,
    };
  }

  if (nextPoint.accuracyMeters != null && nextPoint.accuracyMeters > MAX_ACCURACY_METERS) {
    return {
      accept: false,
      distanceDeltaMeters: 0,
      message: 'GPS accuracy is weak right now. Move into a clearer area and keep running.',
      suspiciousWarning: null,
    };
  }

  if (!previousPoint) {
    return { accept: true, distanceDeltaMeters: 0, message: null, suspiciousWarning: null };
  }

  const previousRecordedAtMs = new Date(previousPoint.recordedAt).getTime();
  const deltaMs = recordedAtMs - previousRecordedAtMs;
  if (deltaMs <= 0) {
    return {
      accept: false,
      distanceDeltaMeters: 0,
      message: 'Ignoring an out-of-order GPS fix.',
      suspiciousWarning: 'Some GPS timestamps became incoherent during this run.',
    };
  }

  const distanceDeltaMeters = haversineDistanceMeters(
    { latitude: previousPoint.latitude, longitude: previousPoint.longitude },
    { latitude: nextPoint.latitude, longitude: nextPoint.longitude },
  );

  if (distanceDeltaMeters < MIN_DUPLICATE_DISTANCE_METERS && deltaMs < MIN_DUPLICATE_WINDOW_MS) {
    return { accept: false, distanceDeltaMeters: 0, message: null, suspiciousWarning: null };
  }

  const deltaSeconds = deltaMs / 1000;
  const segmentSpeedKmh = (distanceDeltaMeters / deltaSeconds) * 3.6;
  if (
    segmentSpeedKmh > MAX_SEGMENT_SPEED_KMH ||
    (distanceDeltaMeters > MAX_JUMP_METERS && deltaMs <= MAX_JUMP_WINDOW_MS)
  ) {
    return {
      accept: false,
      distanceDeltaMeters: 0,
      message: 'Ignoring an impossible GPS jump. Keep the app open until the signal stabilizes.',
      suspiciousWarning: 'Some GPS samples looked suspicious. Run review may look at this attempt.',
    };
  }

  return { accept: true, distanceDeltaMeters, message: null, suspiciousWarning: null };
}

function buildRunResult(
  status: ResultStatus,
  startedAt: string,
  finishedAt: string,
  durationSeconds: number,
  totalDistanceMeters: number,
  trackpoints: LocalTrackpoint[],
): RunResult {
  return {
    status,
    startedAt,
    finishedAt,
    durationSeconds,
    distanceKm: Number((totalDistanceMeters / 1000).toFixed(3)),
    avgSpeedKmh:
      durationSeconds > 0 ? Number((((totalDistanceMeters / 1000) / durationSeconds) * 3600).toFixed(2)) : 0,
    trackpoints,
  };
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

function formatRunPhase(value: RunPhase): string {
  switch (value) {
    case 'running':
      return 'Tracking active';
    case 'completed':
      return 'Completed';
    case 'abandoned':
      return 'Abandoned';
    case 'invalid':
      return 'Invalid';
    default:
      return 'Ready';
  }
}

function formatResultStatus(value: ResultStatus): string {
  switch (value) {
    case 'completed':
      return 'Completed';
    case 'abandoned':
      return 'Abandoned';
    default:
      return 'Invalid';
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, gap: 14 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', padding: 16, gap: 8 },
  header: { gap: 4 },
  title: { fontSize: 28, fontWeight: '700', color: '#0f172a' },
  subtitle: { fontSize: 16, color: '#475569' },
  info: { color: '#334155', lineHeight: 20 },
  warning: { color: '#9a3412', fontWeight: '600' },
  success: { color: '#166534', fontWeight: '600' },
  error: { color: '#b91c1c', fontWeight: '600', textAlign: 'center' },
  mapWrapper: { height: 280, borderRadius: 14, overflow: 'hidden' },
  statusCard: { borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#ffffff', padding: 16, gap: 6 },
  statusLabel: { fontSize: 12, color: '#64748b', fontWeight: '700', textTransform: 'uppercase' },
  statusValue: { fontSize: 20, color: '#0f172a', fontWeight: '700' },
  statsGrid: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#ffffff', padding: 16, gap: 6 },
  statLabel: { fontSize: 12, color: '#64748b', textTransform: 'uppercase', fontWeight: '700' },
  statValue: { fontSize: 22, color: '#0f172a', fontWeight: '700' },
  infoCard: { borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#ffffff', padding: 16, gap: 8 },
  infoTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  primaryButton: { minHeight: 52, borderRadius: 12, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, flex: 1 },
  primaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  secondaryButton: { minHeight: 52, borderRadius: 12, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  secondaryButtonText: { color: '#0f172a', fontSize: 16, fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 12 },
  controlsCard: { borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#ffffff', padding: 16, gap: 10 },
  controlsTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  buttonDisabled: { backgroundColor: '#94a3b8' },
  resultCard: { borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#ffffff', padding: 16, gap: 10 },
  resultTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  resultStats: { gap: 10 },
  resultMetric: { gap: 2 },
  resultMetricLabel: { fontSize: 12, color: '#64748b', fontWeight: '700', textTransform: 'uppercase' },
  resultMetricValue: { fontSize: 17, color: '#0f172a', fontWeight: '700' },
  devModeCard: { borderRadius: 14, borderWidth: 1, borderColor: '#f59e0b', backgroundColor: '#fffbeb', padding: 16, gap: 6 },
  devModeTitle: { fontSize: 13, fontWeight: '800', color: '#92400e', textTransform: 'uppercase' },
});

function createDevRoute(center: LatLng): EventRoute {
  const north = { latitude: center.latitude + 0.003, longitude: center.longitude };
  const southEast = { latitude: center.latitude - 0.002, longitude: center.longitude + 0.003 };
  const southWest = { latitude: center.latitude - 0.002, longitude: center.longitude - 0.003 };

  return {
    startPoint: center,
    endPoint: southEast,
    polyline: [center, north, southEast, southWest, center],
  };
}
