import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import MapView, { Marker, type LatLng } from 'react-native-maps';
import * as Location from 'expo-location';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { darkMapStyle } from '@/constants/darkMapStyle';
import type { RunEvent, EventStatus } from '@/types/event';
import { useAuth } from '@/hooks/useAuth';
import { isDevRunnerActive } from '@/services/devRunnerMode';
import { debugEvents } from '@/services/eventsDebug';
import type { EventListItem } from '@/services/eventsService';
import { fetchPublicEvents, getEventsListErrorMessage } from '@/services/eventsService';
import { getStoredRunSession } from '@/services/runSessionStore';
import { colors, fonts, spacing, typography } from '@/theme/tokens';
import { AppScreen } from '@/components/ui/AppScreen';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';
import { EventCard } from '@/components/ui/EventCard';
import { EventHeroCard } from '@/components/ui/EventHeroCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SectionHeader } from '@/components/ui/SectionHeader';
import type { StatusBadgeTone } from '@/components/ui/StatusBadge';
import { EventBottomSheet } from '@/components/events/EventBottomSheet';
import { InteractiveEventsMap } from '@/components/events/InteractiveEventsMap';
import { MapControls } from '@/components/events/MapControls';
import { MapLegend } from '@/components/events/MapLegend';
import { MapPin } from '@/components/events/MapPin';
import { MapSearchBar } from '@/components/events/MapSearchBar';
import { UserDot } from '@/components/events/UserDot';

// ─── Data mapping ────────────────────────────────────────────────────────────

function deriveStatus(event: EventListItem, nowMs: number): EventStatus {
  const startsAt = new Date(event.startsAt).getTime();
  const endsAt = new Date(event.endsAt ?? event.startsAt).getTime();
  const revealed = new Date(event.revealAt).getTime() <= nowMs;
  const full = event.maxParticipants != null && event.maxParticipants > 0 && (event.participantCount ?? 0) >= event.maxParticipants;

  if (endsAt <= nowMs) return 'completed';
  if (startsAt <= nowMs && revealed) return 'open';
  if (full) return 'full';
  return revealed ? 'open' : 'hidden';
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function mapToRunEvents(events: EventListItem[], userLoc: LatLng | null): RunEvent[] {
  const nowMs = Date.now();
  return events.map((event) => ({
    id: event.id,
    title: event.title,
    description: event.description,
    status: deriveStatus(event, nowMs),
    lat: event.startAreaCenter?.latitude ?? null,
    lng: event.startAreaCenter?.longitude ?? null,
    distanceKm:
      userLoc && event.startAreaCenter
        ? haversineKm(
            userLoc.latitude,
            userLoc.longitude,
            event.startAreaCenter.latitude,
            event.startAreaCenter.longitude,
          )
        : null,
    revealDate: event.revealAt,
    startDate: event.startsAt,
    registeredCount: event.participantCount ?? 0,
    maxParticipants: event.maxParticipants ?? 0,
  }));
}

// Default region: Dublin (matches seed data coordinates)
const DEFAULT_REGION = {
  latitude: 53.3498,
  longitude: -6.2603,
  latitudeDelta: 0.04,
  longitudeDelta: 0.04,
};

// ─── Map screen ──────────────────────────────────────────────────────────────

function EventsMapView({
  events,
  runEvents,
  loading,
  error,
  onRetry,
}: {
  events: EventListItem[];
  runEvents: RunEvent[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['22%', '55%'], []);

  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const currentZoom = useRef({ latDelta: DEFAULT_REGION.latitudeDelta });

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    })();
  }, []);

  const handleLocate = () => {
    if (!userLocation) return;
    mapRef.current?.animateToRegion(
      {
        ...userLocation,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      },
      400,
    );
  };

  const handleZoomIn = () => {
    currentZoom.current.latDelta = Math.max(0.005, currentZoom.current.latDelta / 2);
    mapRef.current?.getCamera().then((cam) => {
      if (!cam.center) return;
      mapRef.current?.animateToRegion(
        {
          latitude: cam.center.latitude,
          longitude: cam.center.longitude,
          latitudeDelta: currentZoom.current.latDelta,
          longitudeDelta: currentZoom.current.latDelta,
        },
        200,
      );
    });
  };

  const handleZoomOut = () => {
    currentZoom.current.latDelta = Math.min(1, currentZoom.current.latDelta * 2);
    mapRef.current?.getCamera().then((cam) => {
      if (!cam.center) return;
      mapRef.current?.animateToRegion(
        {
          latitude: cam.center.latitude,
          longitude: cam.center.longitude,
          latitudeDelta: currentZoom.current.latDelta,
          longitudeDelta: currentZoom.current.latDelta,
        },
        200,
      );
    });
  };

  const handlePinPress = (id: string) => {
    setSelectedEventId(id);
    bottomSheetRef.current?.snapToIndex(1);
    const event = runEvents.find((e) => e.id === id);
    if (event?.lat != null && event.lng != null) {
      mapRef.current?.animateToRegion(
        {
          latitude: event.lat - 0.005,
          longitude: event.lng,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        400,
      );
    }
  };

  const mapPins = runEvents.filter((e) => e.lat != null && e.lng != null);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />

      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        customMapStyle={darkMapStyle}
        initialRegion={userLocation ? { ...userLocation, latitudeDelta: 0.04, longitudeDelta: 0.04 } : DEFAULT_REGION}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
      >
        {userLocation && (
          <Marker coordinate={userLocation} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
            <UserDot />
          </Marker>
        )}

        {mapPins.map((event) => (
          <Marker
            key={event.id}
            coordinate={{ latitude: event.lat!, longitude: event.lng! }}
            anchor={{ x: 0, y: 1 }}
            tracksViewChanges={false}
            onPress={() => handlePinPress(event.id)}
          >
            <MapPin event={event} />
          </Marker>
        ))}
      </MapView>

      {/* Floating header */}
      <View
        style={[styles.floatingHeader, { paddingTop: insets.top + 8 }]}
        pointerEvents="box-none"
      >
        <View style={styles.headerContent} pointerEvents="box-none">
          <MapSearchBar
            onGeocode={(coords) =>
              mapRef.current?.animateToRegion(
                { ...coords, latitudeDelta: 0.02, longitudeDelta: 0.02 },
                400,
              )
            }
          />
          <MapLegend />
        </View>
      </View>

      {loading && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator color={colors.accent} size="small" />
        </View>
      )}

      {error && (
        <View style={styles.errorBanner} pointerEvents="box-none">
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={onRetry} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      <MapControls
        onLocate={handleLocate}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
      />

      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={styles.sheetHandle}
      >
        <BottomSheetView style={styles.sheetContent}>
          <EventBottomSheet
            events={runEvents}
            selectedEventId={selectedEventId}
            onSelectEvent={handlePinPress}
          />
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}

// ─── Web / list fallback ─────────────────────────────────────────────────────

interface EventPresentationModel {
  event: EventListItem;
  section: 'ready' | 'coming' | 'completed';
  eyebrow: string;
  description: string;
  statusBadge: { label: string; tone: StatusBadgeTone };
  statusItems: Array<{ label: string; tone: StatusBadgeTone }>;
  meta: Array<{ label: string; value: string; icon: 'reveal' | 'start' | 'zone' }>;
  primaryActionLabel: string;
  primaryHref: `/events/${string}` | `/run/${string}`;
  primaryTone: 'primary' | 'secondary';
}

function EventsListView({
  events,
  loading,
  error,
  onRetry,
}: {
  events: EventListItem[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const router = useRouter();
  const { isAuthenticated, isAvailable: isAuthAvailable } = useAuth();
  const [nowMs, setNowMs] = useState(() => Date.now());
  const devRunnerActive = isDevRunnerActive();

  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const eventModels = useMemo(
    () =>
      events.map((event) =>
        buildEventPresentation(event, { devRunnerActive, isAuthenticated, isAuthAvailable, nowMs }),
      ),
    [devRunnerActive, events, isAuthAvailable, isAuthenticated, nowMs],
  );
  const heroEvent = useMemo(() => selectHeroEvent(eventModels), [eventModels]);
  const sections = useMemo(
    () => buildSections(eventModels, heroEvent?.event.id ?? null),
    [eventModels, heroEvent?.event.id],
  );

  useEffect(() => {
    debugEvents('screen.sections', {
      rawEventCount: events.length,
      eventModelCount: eventModels.length,
      heroEventId: heroEvent?.event.id ?? null,
      sections: sections.map((s) => ({ key: s.key, count: s.items.length })),
    });
  }, [eventModels, events.length, heroEvent?.event.id, sections]);

  if (loading) {
    return (
      <AppScreen scrollable={false} contentContainerStyle={styles.centered}>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={styles.stateText}>Loading the next run window...</Text>
      </AppScreen>
    );
  }

  if (error) {
    return (
      <AppScreen scrollable={false} contentContainerStyle={styles.centered}>
        <Text style={styles.stateTitle}>Events</Text>
        <Text style={styles.errorText}>{error}</Text>
        <PrimaryButton label="Retry" onPress={onRetry} style={styles.stateButton} />
      </AppScreen>
    );
  }

  if (eventModels.length === 0) {
    return (
      <AppScreen contentContainerStyle={styles.listContent}>
        <View style={styles.intro}>
          <Text style={styles.screenTitle}>Tonight</Text>
          <Text style={styles.screenSubtitle}>Hidden starts. Clear timing.</Text>
        </View>
        <EmptyStateCard minimal title="Nothing live yet" />
        <PrimaryButton label="Refresh" onPress={onRetry} />
      </AppScreen>
    );
  }

  return (
    <AppScreen contentContainerStyle={styles.listContent}>
      <View style={styles.intro}>
        <Text style={styles.screenTitle}>Tonight</Text>
        <Text style={styles.screenSubtitle}>Hidden starts. Clear timing.</Text>
      </View>

      {heroEvent ? (
        <EventHeroCard
          eyebrow={heroEvent.eyebrow}
          title={heroEvent.event.title}
          description={heroEvent.description}
          metaItems={heroEvent.meta}
          statusBadge={heroEvent.statusBadge}
          primaryAction={{ label: heroEvent.primaryActionLabel, onPress: () => router.push(heroEvent.primaryHref) }}
          {...(heroEvent.primaryHref === `/events/${heroEvent.event.id}`
            ? {}
            : { secondaryAction: { label: 'Brief', onPress: () => router.push(`/events/${heroEvent.event.id}`) } })}
        />
      ) : null}

      {sections.map((section) => (
        <View key={section.key} style={styles.section}>
          <SectionHeader {...(section.subtitle ? { subtitle: section.subtitle } : {})} title={section.title} />
          {section.items.length === 0 ? (
            <EmptyStateCard minimal title={section.emptyTitle} description={section.emptyDescription} />
          ) : (
            section.items.map((item) => (
              <EventCard
                key={item.event.id}
                eyebrow={item.eyebrow}
                title={item.event.title}
                description={item.description}
                statusBadge={item.statusBadge}
                statusItems={item.statusItems}
                meta={item.meta}
                primaryAction={{
                  label: item.primaryActionLabel,
                  onPress: () => router.push(item.primaryHref),
                  tone: item.primaryTone,
                }}
              />
            ))
          )}
        </View>
      ))}
    </AppScreen>
  );
}

// ─── Root export ─────────────────────────────────────────────────────────────

export default function EventsScreen() {
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    fetchPublicEvents()
      .then((nextEvents) => {
        if (active) setEvents(nextEvents);
      })
      .catch((err: unknown) => {
        if (active) setError(getEventsListErrorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const runEvents = useMemo(() => mapToRunEvents(events, userLocation), [events, userLocation]);

  const onRetry = () => setReloadKey((k) => k + 1);

  if (Platform.OS === 'web') {
    return (
      <InteractiveEventsMap
        events={runEvents}
        loading={loading}
        error={error}
        onRetry={onRetry}
      />
    );
  }

  return (
    <EventsMapView
      events={events}
      runEvents={runEvents}
      loading={loading}
      error={error}
      onRetry={onRetry}
    />
  );
}

// ─── List-view helpers (web fallback) ────────────────────────────────────────

interface EventSectionModel {
  key: 'ready' | 'coming' | 'completed';
  title: string;
  subtitle?: string;
  emptyTitle: string;
  emptyDescription: string;
  items: EventPresentationModel[];
}

function buildSections(models: EventPresentationModel[], heroId: string | null): EventSectionModel[] {
  const visible = models.filter((m) => m.event.id !== heroId);
  const completed = visible.filter((m) => m.section === 'completed');
  const sections: EventSectionModel[] = [
    { key: 'ready', title: 'Ready now', subtitle: 'Registered runners with a live start window', emptyTitle: 'Nothing ready yet', emptyDescription: '', items: visible.filter((m) => m.section === 'ready') },
    { key: 'coming', title: 'Coming up', subtitle: 'Upcoming reveals and start windows', emptyTitle: 'Nothing queued', emptyDescription: '', items: visible.filter((m) => m.section === 'coming') },
  ];
  if (completed.length > 0) {
    sections.push({ key: 'completed', title: 'Saved runs', subtitle: 'Completed on this device or closed already', emptyTitle: '', emptyDescription: '', items: completed });
  }
  return sections;
}

function selectHeroEvent(models: EventPresentationModel[]): EventPresentationModel | null {
  for (const section of ['ready', 'coming', 'completed'] as const) {
    const match = models.find((m) => m.section === section);
    if (match) return match;
  }
  return models[0] ?? null;
}

function buildEventPresentation(
  event: EventListItem,
  { devRunnerActive, isAuthenticated, isAuthAvailable, nowMs }: { devRunnerActive: boolean; isAuthenticated: boolean; isAuthAvailable: boolean; nowMs: number },
): EventPresentationModel {
  const revealAt = new Date(event.revealAt).getTime();
  const startsAt = new Date(event.startsAt).getTime();
  const endsAt = new Date(event.endsAt ?? event.startsAt).getTime();
  const revealed = revealAt <= nowMs;
  const started = startsAt <= nowMs;
  const past = endsAt <= nowMs;
  const joined = event.viewerParticipationStatus === 'registered';
  const storedRunSession = getStoredRunSession(event.id);
  const finished = storedRunSession?.phase === 'completed';
  const readyNow = joined && !finished && (devRunnerActive || (revealed && started && !past));
  const guestViewer = !joined && !devRunnerActive && !isAuthenticated && isAuthAvailable;
  const authOffline = !joined && !devRunnerActive && !isAuthenticated && !isAuthAvailable;

  const section: EventPresentationModel['section'] = readyNow ? 'ready' : finished || past ? 'completed' : 'coming';
  const statusLabel = finished ? 'Run saved' : readyNow ? 'Start window open' : past ? 'Window closed' : revealed ? 'Reveal live' : 'Upcoming';
  const statusBadge = { label: statusLabel, tone: getBadgeTone(statusLabel) };
  const statusItems = buildCardStatusItems({ authOffline, guestViewer, joined, past, readyNow, revealed });
  const eyebrow = getEventEyebrow({ nowMs, readyNow, section, startsAt });
  const description = getSignalDescription(event.description, getFallbackDescription({ authOffline, finished, guestViewer, joined, past, readyNow, revealed, started }));

  let primaryActionLabel = 'Brief';
  let primaryHref: EventPresentationModel['primaryHref'] = `/events/${event.id}`;
  let primaryTone: EventPresentationModel['primaryTone'] = 'secondary';
  if (finished) { primaryActionLabel = 'Result'; primaryHref = `/run/${event.id}`; primaryTone = 'primary'; }
  else if (readyNow) { primaryActionLabel = 'Start'; primaryHref = `/run/${event.id}`; primaryTone = 'primary'; }

  return {
    event, section, eyebrow, description, primaryActionLabel, primaryHref, primaryTone, statusBadge, statusItems,
    meta: [
      { label: 'Reveal', value: formatDateTime(event.revealAt, nowMs), icon: 'reveal' },
      { label: 'Start', value: formatDateTime(event.startsAt, nowMs), icon: 'start' },
      { label: 'Zone', value: `${event.startAreaRadiusKm} km`, icon: 'zone' },
    ],
  };
}

function getBadgeTone(label: string): StatusBadgeTone {
  switch (label) {
    case 'Start window open': return 'success';
    case 'Reveal live': return 'accent';
    case 'Upcoming': return 'neutral';
    case 'Run saved': return 'info';
    case 'Window closed': return 'warning';
    default: return 'neutral';
  }
}

function getSignalDescription(source: string | null, fallback: string): string {
  const normalized = source?.replace(/\s+/g, ' ').trim();
  if (!normalized) return fallback;
  const words = normalized.split(' ');
  if (words.length <= 12 && normalized.length <= 84) return normalized;
  return fallback;
}

function buildCardStatusItems({ authOffline, guestViewer, joined, past, readyNow, revealed }: { authOffline: boolean; guestViewer: boolean; joined: boolean; past: boolean; readyNow: boolean; revealed: boolean }): Array<{ label: string; tone: StatusBadgeTone }> {
  const items: Array<{ label: string; tone: StatusBadgeTone }> = [];
  if (joined) items.push({ label: 'Registered', tone: readyNow ? 'success' : 'accent' });
  else if (guestViewer) items.push({ label: 'Guest', tone: 'neutral' });
  else if (authOffline) items.push({ label: 'Auth offline', tone: 'neutral' });
  if (!past && !readyNow) items.push({ label: revealed ? 'Reveal live' : 'Route locked', tone: revealed ? 'accent' : 'warning' });
  return items;
}

function getEventEyebrow({ nowMs, readyNow, section, startsAt }: { nowMs: number; readyNow: boolean; section: EventPresentationModel['section']; startsAt: number }) {
  if (readyNow) return 'Ready now';
  if (section === 'completed') return 'Saved';
  if (isSameCalendarDay(startsAt, nowMs)) return 'Tonight';
  if (isTomorrow(startsAt, nowMs)) return 'Tomorrow';
  return new Date(startsAt).toLocaleString([], { weekday: 'short' });
}

function getFallbackDescription({ authOffline, finished, guestViewer, joined, past, readyNow, revealed, started }: { authOffline: boolean; finished: boolean; guestViewer: boolean; joined: boolean; past: boolean; readyNow: boolean; revealed: boolean; started: boolean }): string {
  if (finished) return 'Run saved on this device.';
  if (readyNow) return 'Route live. Start window open.';
  if (past) return 'Event window closed.';
  if (joined) return revealed ? 'Reveal live. Waiting for the start window.' : 'Registered. Route locked until reveal.';
  if (guestViewer) return revealed ? 'Reveal live. Sign in to join.' : 'Guest view. Sign in before reveal.';
  if (authOffline) return revealed ? 'Reveal live. Brief available in guest mode.' : 'Route locked. Brief available in guest mode.';
  if (revealed) return started ? 'Reveal live. Join to unlock run access.' : 'Reveal live. Join before the start window opens.';
  return 'Join before reveal. Route stays locked.';
}

function formatDateTime(value: string, nowMs: number): string {
  const date = new Date(value);
  const time = date.toLocaleString([], { hour: '2-digit', minute: '2-digit' });
  const ms = date.getTime();
  if (isSameCalendarDay(ms, nowMs)) return `Today ${time}`;
  if (isTomorrow(ms, nowMs)) return `Tomorrow ${time}`;
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function isSameCalendarDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

function isTomorrow(valueMs: number, nowMs: number): boolean {
  const next = new Date(nowMs);
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() + 1);
  const after = new Date(next);
  after.setDate(after.getDate() + 1);
  return valueMs >= next.getTime() && valueMs < after.getTime();
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerContent: {
    paddingHorizontal: 16,
    gap: 10,
    paddingBottom: 4,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 130,
    right: 20,
    backgroundColor: 'rgba(12,10,20,0.80)',
    borderRadius: 10,
    padding: 10,
  },
  errorBanner: {
    position: 'absolute',
    bottom: '30%',
    left: 16,
    right: 16,
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.30)',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.dmSans400,
    color: '#F87171',
    lineHeight: 18,
  },
  retryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(248,113,113,0.15)',
    borderRadius: 8,
  },
  retryText: {
    fontSize: 12,
    fontFamily: fonts.dmSans600,
    color: '#F87171',
    fontWeight: '600',
  },
  sheetBg: {
    backgroundColor: 'rgba(10,10,15,0.94)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sheetHandle: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 36,
  },
  sheetContent: {
    flex: 1,
  },
  // List-view styles
  listContent: {
    gap: spacing.lg,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  intro: {
    gap: spacing.xs,
  },
  screenTitle: {
    ...typography.heroTitle,
    color: colors.textPrimary,
  },
  screenSubtitle: {
    ...typography.bodySm,
    color: colors.textMuted,
  },
  section: {
    gap: spacing.sm,
  },
  stateTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
  },
  stateText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 260,
  },
  stateButton: {
    minWidth: 160,
  },
});
