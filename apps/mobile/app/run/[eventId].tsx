import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import type { LocationObject } from 'expo-location';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import type { LatLng } from 'react-native-maps';
import { RouteMap } from '@/components/RouteMap';
import { ActionBar } from '@/components/ui/ActionBar';
import { AppScreen } from '@/components/ui/AppScreen';
import { InfoRow } from '@/components/ui/InfoRow';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { SectionCard } from '@/components/ui/SectionCard';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge, type StatusBadgeTone } from '@/components/ui/StatusBadge';
import { StatusStrip } from '@/components/ui/StatusStrip';
import { formatValidationReason } from '@/services/betaDiagnostics';
import {
  ActivityUploadError,
  getActivityErrorMessage,
  persistCompletedRun,
  type LocalTrackpoint,
  type UploadedActivity,
} from '@/services/activitiesService';
import { DEV_MODE_LABEL, isDevRunnerActive } from '@/services/devRunnerMode';
import { canFetchProtectedEventRoute, fetchEventRoute } from '@/services/eventRoutes';
import { fetchEventDetails, type EventDetail } from '@/services/eventsService';
import { getStoredRunSession, setStoredRunSession } from '@/services/runSessionStore';
import { colors, spacing, typography } from '@/theme/tokens';
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
          setPermissionMessage('Location needed.');
          return;
        }

        setPermissionState('granted');
        setPermissionMessage(null);

        const initialLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (active) {
          setCurrentLocation(initialLocation.coords);
        }

        if (isWeb) {
          setPermissionMessage('Tracking limited on web.');
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
          setPermissionMessage(err instanceof Error ? err.message : 'Location unavailable.');
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
    setFinishWarning('Saved local only.');
    setUploadError('Local only.');

    if (resolvedEventId) {
      setStoredRunSession(resolvedEventId, {
        phase: 'abandoned',
        draft: null,
        result: nextResult,
        uploadedActivity: null,
        uploadError: 'Local only.',
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
        'Need more GPS samples.',
      );
      return;
    }

    if (durationSeconds < MIN_RUN_DURATION_SECONDS) {
      finalizeInvalidRun(
        buildRunResult('invalid', effectiveStartedAt, finishedAt, durationSeconds, totalDistanceMeters, allTrackpoints),
        `Min ${MIN_RUN_DURATION_SECONDS}s required.`,
      );
      return;
    }

    if (totalDistanceMeters < MIN_RUN_DISTANCE_METERS) {
      finalizeInvalidRun(
        buildRunResult('invalid', effectiveStartedAt, finishedAt, durationSeconds, totalDistanceMeters, allTrackpoints),
        `Min ${(MIN_RUN_DISTANCE_METERS / 1000).toFixed(2)} km required.`,
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
          ? formatValidationReason(activity.validationReason) ?? 'Flagged in review.'
          : suspiciousWarningRef.current
            ? 'Uploaded with GPS warnings.'
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
      setFinishWarning('Saved locally. Retry sync.');

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

  const runPresentation = getRunPresentation({
    runPhase,
    canStart,
    insideStartZone,
    permissionState,
    uploading,
    uploadError,
    uploadedActivity,
  });

  const zonePresentation = getZonePresentation({
    canStart,
    currentLatLng,
    distanceToStartMeters,
    insideStartZone,
    permissionState,
    runPhase,
  });

  const systemItems = buildSystemItems({
    devRunnerActive,
    isWeb,
  });

  const systemRows = buildSystemRows({
    currentLatLng,
    finishWarning,
    gpsQualityMessage,
    isWeb,
    permissionMessage,
    permissionState,
    runPhase,
    suspiciousWarning,
    trackpointCount: trackpoints.length,
    uploadError,
    uploadedActivity,
  });

  if (loading) {
    return (
      <AppScreen scrollable={false} contentContainerStyle={styles.centered}>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={styles.stateText}>Loading run brief...</Text>
      </AppScreen>
    );
  }

  if (accessDeniedMessage) {
    return (
      <AppScreen scrollable={false} contentContainerStyle={styles.centered}>
        <Text style={styles.stateTitle}>Run</Text>
        <Text style={styles.warningText}>{accessDeniedMessage}</Text>
        <Text style={styles.stateText}>Redirecting to the brief.</Text>
      </AppScreen>
    );
  }

  if (error || !event || !route) {
    return (
      <AppScreen scrollable={false} contentContainerStyle={styles.centered}>
        <Text style={styles.stateTitle}>Run</Text>
        <Text style={styles.errorText}>{error ?? 'No route available.'}</Text>
        <SecondaryButton label="Back to event" onPress={() => router.replace(`/events/${resolvedEventId ?? ''}`)} />
      </AppScreen>
    );
  }

  return (
    <AppScreen contentContainerStyle={styles.content}>
      <ScreenHeader title={event.title} subtitle={runPresentation.line} accessory={<StatusBadge label={runPresentation.label} tone={runPresentation.tone} />} />

      {systemItems.length > 0 ? <StatusStrip compact muted items={systemItems} /> : null}

      <SectionCard tone="accent">
        <View style={styles.statsRow}>
          <StatCard
            label="Timer"
            value={formatDuration(runPhase === 'running' ? elapsedSeconds : result?.durationSeconds ?? elapsedSeconds)}
          />
          <StatCard
            label="Distance"
            value={`${(runPhase === 'running' ? liveStats.distanceKm : result?.distanceKm ?? liveStats.distanceKm).toFixed(3)} km`}
          />
        </View>
        <View style={styles.statsRow}>
          <StatCard
            label="Speed"
            value={`${(runPhase === 'running' ? liveStats.avgSpeedKmh : result?.avgSpeedKmh ?? liveStats.avgSpeedKmh).toFixed(2)} km/h`}
          />
          <StatCard label="Zone" value={zonePresentation.metricValue} />
        </View>
      </SectionCard>

      <SectionCard title="Route" accessory={<StatusBadge compact label={runPhase === 'running' ? 'Live' : 'Ready'} tone={runPhase === 'running' ? 'success' : 'accent'} />}>
        <View style={styles.mapCard}>
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
      </SectionCard>

      <SectionCard title="System" tone="muted">
        {systemRows.map((row) => (
          <InfoRow key={`${row.label}-${row.value}`} label={row.label} tone={row.tone} value={row.value} />
        ))}
      </SectionCard>

      {runPhase === 'ready' ? (
        <ActionBar
          secondary={<SecondaryButton label="Back" onPress={() => router.replace(`/events/${event.id}`)} />}
          primary={<PrimaryButton label="Start" onPress={handleStartRun} disabled={!canStart} />}
        />
      ) : null}

      {runPhase === 'running' ? (
        <SectionCard title="Controls" subtitle={`Min ${(MIN_RUN_DISTANCE_METERS / 1000).toFixed(2)} km • ${MIN_RUN_DURATION_SECONDS}s`} tone="muted">
          <ActionBar
            secondary={<SecondaryButton label="Abandon" onPress={handleAbandonRun} />}
            primary={<PrimaryButton label="Finish" onPress={() => void handleFinishRun()} />}
          />
        </SectionCard>
      ) : null}

      {result ? (
        <SectionCard
          title="Result"
          subtitle={getResultLine({ result, uploadedActivity, uploadError, uploading })}
          accessory={<StatusBadge label={formatResultStatus(result.status)} tone={getResultTone(result.status, uploadedActivity)} />}
        >
          <InfoRow label="Duration" value={formatDuration(result.durationSeconds)} />
          <InfoRow label="Distance" value={`${result.distanceKm.toFixed(3)} km`} />
          <InfoRow label="Avg speed" value={`${result.avgSpeedKmh.toFixed(2)} km/h`} />
          <InfoRow label="Points" value={uploadedActivity ? String(uploadedActivity.points) : 'Pending'} />
          <ActionBar
            secondary={<SecondaryButton label="Event" onPress={() => router.replace(`/events/${event.id}`)} />}
            primary={
              result.status === 'completed' && uploadError ? (
                <PrimaryButton label="Retry upload" onPress={() => void persistResult(result, uploadedActivityRef.current)} />
              ) : undefined
            }
          />
        </SectionCard>
      ) : null}
    </AppScreen>
  );
}

function getRunPresentation({
  runPhase,
  canStart,
  insideStartZone,
  permissionState,
  uploading,
  uploadError,
  uploadedActivity,
}: {
  runPhase: RunPhase;
  canStart: boolean;
  insideStartZone: boolean;
  permissionState: PermissionState;
  uploading: boolean;
  uploadError: string | null;
  uploadedActivity: UploadedActivity | null;
}) {
  if (uploading) {
    return { label: 'Uploading', tone: 'warning' as const, line: 'Sync in progress.' };
  }

  if (uploadedActivity?.status === 'rejected') {
    return { label: 'Flagged', tone: 'warning' as const, line: 'Run under review.' };
  }

  if (runPhase === 'completed') {
    return {
      label: uploadError ? 'Saved local' : 'Validated',
      tone: uploadError ? ('info' as const) : ('success' as const),
      line: uploadError ? 'Saved locally. Sync pending.' : 'Run complete.',
    };
  }

  if (runPhase === 'running') {
    return { label: 'Running', tone: 'success' as const, line: 'Tracking live.' };
  }

  if (runPhase === 'abandoned') {
    return { label: 'Abandoned', tone: 'warning' as const, line: 'Run stopped.' };
  }

  if (runPhase === 'invalid') {
    return { label: 'Invalid', tone: 'danger' as const, line: 'Run not valid.' };
  }

  if (permissionState !== 'granted') {
    return { label: 'GPS needed', tone: 'warning' as const, line: 'Location needed.' };
  }

  if (!insideStartZone && !canStart) {
    return { label: 'Move to zone', tone: 'warning' as const, line: 'Move into the zone.' };
  }

  return { label: 'Ready', tone: 'accent' as const, line: 'Route armed.' };
}

function getZonePresentation({
  canStart,
  currentLatLng,
  distanceToStartMeters,
  insideStartZone,
  permissionState,
  runPhase,
}: {
  canStart: boolean;
  currentLatLng: LatLng | null;
  distanceToStartMeters: number | null;
  insideStartZone: boolean;
  permissionState: PermissionState;
  runPhase: RunPhase;
}) {
  if (runPhase === 'running') {
    return { label: 'Tracking', tone: 'success' as const, line: 'Run live.', metricValue: 'Live' };
  }

  if (permissionState !== 'granted') {
    return { label: 'Zone', tone: 'neutral' as const, line: 'Waiting for GPS.', metricValue: 'Waiting' };
  }

  if (!currentLatLng || distanceToStartMeters === null) {
    return { label: 'Zone', tone: 'neutral' as const, line: 'Locating.', metricValue: 'Locating' };
  }

  if (insideStartZone || canStart) {
    return { label: 'In zone', tone: 'success' as const, line: 'Start armed.', metricValue: 'In zone' };
  }

  return {
    label: `${Math.round(distanceToStartMeters)} m`,
    tone: 'warning' as const,
    line: 'Move closer.',
    metricValue: `${Math.round(distanceToStartMeters)} m`,
  };
}

function buildSystemItems({
  devRunnerActive,
  isWeb,
}: {
  devRunnerActive: boolean;
  isWeb: boolean;
}) {
  return [
    ...(devRunnerActive ? [{ label: DEV_MODE_LABEL, tone: 'warning' as const }] : []),
    ...(isWeb ? [{ label: 'Web preview', tone: 'info' as const }] : []),
  ];
}

function buildSystemRows({
  currentLatLng,
  finishWarning,
  gpsQualityMessage,
  isWeb,
  permissionMessage,
  permissionState,
  runPhase,
  suspiciousWarning,
  trackpointCount,
  uploadError,
  uploadedActivity,
}: {
  currentLatLng: LatLng | null;
  finishWarning: string | null;
  gpsQualityMessage: string | null;
  isWeb: boolean;
  permissionMessage: string | null;
  permissionState: PermissionState;
  runPhase: RunPhase;
  suspiciousWarning: string | null;
  trackpointCount: number;
  uploadError: string | null;
  uploadedActivity: UploadedActivity | null;
}) {
  return [
    {
      label: 'Mode',
      value: isWeb ? 'Web preview only' : 'Live GPS on mobile',
      tone: isWeb ? ('muted' as const) : ('success' as const),
    },
    {
      label: 'GPS',
      value:
        gpsQualityMessage ??
        permissionMessage ??
        (permissionState === 'granted' ? (currentLatLng ? 'Locked' : 'Waiting for fix') : permissionState === 'loading' ? 'Requesting' : 'Location needed'),
      tone:
        gpsQualityMessage || permissionState === 'denied' || permissionState === 'error'
          ? ('warning' as const)
          : permissionState === 'granted'
            ? ('success' as const)
            : ('muted' as const),
    },
    {
      label: 'Trace',
      value: trackpointCount > 0 ? `${trackpointCount} fixes` : 'No trace yet',
      tone: runPhase === 'running' ? ('success' as const) : ('muted' as const),
    },
    {
      label: 'Sync',
      value: uploadError ?? (uploadedActivity ? 'Synced' : runPhase === 'ready' ? 'Idle' : 'Pending'),
      tone: uploadError ? ('warning' as const) : uploadedActivity ? ('success' as const) : ('muted' as const),
    },
    ...(
      uploadedActivity?.status === 'rejected' || suspiciousWarning || finishWarning
        ? [
            {
              label: 'Review',
              value:
                uploadedActivity?.status === 'rejected'
                  ? formatValidationReason(uploadedActivity.validationReason) ?? 'Flagged'
                  : suspiciousWarning ?? finishWarning ?? 'Flagged',
              tone: 'warning' as const,
            },
          ]
        : []
    ),
  ];
}

function getResultTone(resultStatus: ResultStatus, uploadedActivity: UploadedActivity | null): StatusBadgeTone {
  if (uploadedActivity?.status === 'rejected') {
    return 'warning';
  }

  switch (resultStatus) {
    case 'completed':
      return 'success';
    case 'abandoned':
      return 'warning';
    default:
      return 'danger';
  }
}

function getResultLine({
  result,
  uploadedActivity,
  uploadError,
  uploading,
}: {
  result: RunResult;
  uploadedActivity: UploadedActivity | null;
  uploadError: string | null;
  uploading: boolean;
}) {
  if (uploading) {
    return 'Uploading result.';
  }

  if (uploadedActivity?.status === 'rejected') {
    return 'Run flagged during review.';
  }

  if (uploadError) {
    return 'Saved locally. Retry sync when ready.';
  }

  if (result.status === 'completed') {
    return 'Run stored and scored.';
  }

  if (result.status === 'abandoned') {
    return 'Run kept locally only.';
  }

  return 'Run did not validate.';
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
      suspiciousWarning: 'GPS timing looked inconsistent.',
    };
  }

  if (Date.now() - recordedAtMs > MAX_STALE_FIX_MS) {
    return {
      accept: false,
      distanceDeltaMeters: 0,
      message: 'Waiting for a fresher GPS fix.',
      suspiciousWarning: null,
    };
  }

  if (nextPoint.accuracyMeters != null && nextPoint.accuracyMeters > MAX_ACCURACY_METERS) {
    return {
      accept: false,
      distanceDeltaMeters: 0,
      message: 'GPS weak. Move to a clearer area.',
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
      message: 'Out-of-order GPS fix ignored.',
      suspiciousWarning: 'GPS timestamps looked incoherent.',
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
      message: 'Impossible GPS jump ignored.',
      suspiciousWarning: 'GPS samples looked suspicious.',
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
  content: {
    gap: spacing.lg,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  stateTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
  },
  stateText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
  },
  errorText: {
    ...typography.body,
    color: colors.danger,
    textAlign: 'center',
    maxWidth: 320,
  },
  warningText: {
    ...typography.body,
    color: colors.warning,
    textAlign: 'center',
    maxWidth: 320,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  mapCard: {
    height: 320,
    overflow: 'hidden',
    borderRadius: 16,
  },
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
