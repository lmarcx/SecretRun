import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import type { LatLng } from 'react-native-maps';
import type { EventStatus, RunEvent } from '@/types/event';
import { colors, fonts } from '@/theme/tokens';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface InteractiveEventsMapProps {
  events: RunEvent[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

interface EventPin extends RunEvent {
  x: number;
  y: number;
  distanceKm: number | null;
}

const STATUS_META: Record<
  EventStatus,
  {
    label: string;
    legend: string;
    icon: IoniconName;
    color: string;
    bg: string;
    border: string;
    pulse: string;
  }
> = {
  hidden: {
    label: 'Hidden route',
    legend: 'Hidden',
    icon: 'lock-closed',
    color: '#C4A3FF',
    bg: 'rgba(130,80,255,0.20)',
    border: 'rgba(130,80,255,0.50)',
    pulse: 'rgba(130,80,255,0.16)',
  },
  full: {
    label: 'Validated',
    legend: 'Validated',
    icon: 'people',
    color: '#F0C84E',
    bg: 'rgba(232,184,75,0.18)',
    border: 'rgba(232,184,75,0.50)',
    pulse: 'rgba(232,184,75,0.12)',
  },
  open: {
    label: 'Live now',
    legend: 'Live',
    icon: 'walk',
    color: '#5DDDB8',
    bg: 'rgba(78,204,163,0.15)',
    border: 'rgba(78,204,163,0.40)',
    pulse: 'rgba(78,204,163,0.14)',
  },
  completed: {
    label: 'Completed',
    legend: 'Done',
    icon: 'checkmark-done',
    color: '#93C5FD',
    bg: 'rgba(96,165,250,0.15)',
    border: 'rgba(96,165,250,0.40)',
    pulse: 'rgba(96,165,250,0.12)',
  },
};

const DEFAULT_CENTER: LatLng = { latitude: 53.3498, longitude: -6.2603 };
const FALLBACK_POSITIONS = [
  { x: 22, y: 38, distanceKm: 0.4 },
  { x: 62, y: 26, distanceKm: 1.1 },
  { x: 75, y: 55, distanceKm: 1.8 },
  { x: 42, y: 62, distanceKm: 2.3 },
  { x: 16, y: 68, distanceKm: 3.0 },
  { x: 58, y: 72, distanceKm: 3.6 },
  { x: 30, y: 23, distanceKm: 4.2 },
];

export function InteractiveEventsMap({
  error,
  events,
  loading,
  onRetry,
}: InteractiveEventsMapProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [center, setCenter] = useState<LatLng>(DEFAULT_CENTER);
  const [locationLabel, setLocationLabel] = useState('Dublin nearby');
  const [zoom, setZoom] = useState(1);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(events[0]?.id ?? null);

  const pins = useMemo(() => buildPins(events, center, zoom), [center, events, zoom]);
  const selectedEvent = pins.find((event) => event.id === selectedEventId) ?? pins[0] ?? null;
  const sortedPins = useMemo(
    () =>
      [...pins].sort((a, b) => {
        if (a.status !== b.status) return statusRank(a.status) - statusRank(b.status);
        return (a.distanceKm ?? 99) - (b.distanceKm ?? 99);
      }),
    [pins],
  );

  const stats = useMemo(
    () => ({
      open: pins.filter((event) => event.status === 'open').length,
      full: pins.filter((event) => event.status === 'full').length,
      completed: pins.filter((event) => event.status === 'completed').length,
    }),
    [pins],
  );

  const handleSearch = async () => {
    const address = query.trim();
    if (!address) return;

    setSearching(true);
    try {
      const results = await Location.geocodeAsync(address);
      const first = results[0];
      if (first) {
        setCenter({ latitude: first.latitude, longitude: first.longitude });
        setLocationLabel(address);
      }
    } finally {
      setSearching(false);
    }
  };

  const handleLocate = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') return;

    const position = await Location.getCurrentPositionAsync({});
    setCenter({ latitude: position.coords.latitude, longitude: position.coords.longitude });
    setLocationLabel('Current location');
  };

  const navigateToEvent = (event: RunEvent) => {
    if (event.status === 'open') {
      router.push(`/run/${event.id}`);
      return;
    }

    router.push(`/events/${event.id}`);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Events</Text>
          <HeaderButton icon="layers-outline" />
          <HeaderButton icon="options-outline" />
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.38)" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search city, district, address..."
            placeholderTextColor="rgba(255,255,255,0.30)"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searching ? (
            <ActivityIndicator color="rgba(255,255,255,0.45)" size="small" />
          ) : (
            <Pressable onPress={handleSearch} style={styles.searchSubmit}>
              <Text style={styles.searchSubmitText}>Go</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.legend}>
          {(Object.keys(STATUS_META) as EventStatus[]).map((status) => (
            <View key={status} style={styles.legendPill}>
              <View style={[styles.legendDot, { backgroundColor: STATUS_META[status].color }]} />
              <Text style={styles.legendText}>{STATUS_META[status].legend}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.mapWrap}>
        <MapSketch zoom={zoom} />
        <View style={styles.userRadius} />
        <View style={styles.userRadiusOuter} />
        <View style={styles.userDotOuter}>
          <View style={styles.userDotInner} />
        </View>

        {pins.map((event) => (
          <EventMapPin
            key={event.id}
            event={event}
            selected={selectedEvent?.id === event.id}
            onPress={() => setSelectedEventId(event.id)}
          />
        ))}

        <View style={styles.controls}>
          <Pressable onPress={() => setZoom((value) => Math.min(1.45, value + 0.12))} style={styles.controlButton}>
            <Ionicons color="rgba(255,255,255,0.68)" name="add" size={20} />
          </Pressable>
          <View style={styles.controlDivider} />
          <Pressable onPress={() => setZoom((value) => Math.max(0.72, value - 0.12))} style={styles.controlButton}>
            <Ionicons color="rgba(255,255,255,0.68)" name="remove" size={20} />
          </Pressable>
          <View style={styles.controlGap} />
          <Pressable onPress={handleLocate} style={[styles.controlButton, styles.locateButton]}>
            <Ionicons color="#4ECCA3" name="locate-outline" size={19} />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.stateOverlay}>
            <ActivityIndicator color={colors.accent} size="small" />
            <Text style={styles.stateText}>Loading events...</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorOverlay}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={onRetry} style={styles.retryButton}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <View style={styles.sheet}>
        <View style={styles.sheetFade}>
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>
          <View style={styles.sheetMeta}>
            <View>
              <Text style={styles.sheetTitle}>{pins.length} events nearby</Text>
              <Text style={styles.sheetLocation}>{locationLabel}</Text>
            </View>
            <View style={styles.statsRow}>
              <StatPill color="#5DDDB8" label="Live" value={stats.open} />
              <StatPill color="#F0C84E" label="Validated" value={stats.full} />
              <StatPill color="#93C5FD" label="Done" value={stats.completed} />
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eventsScroll}>
            {sortedPins.length === 0 ? (
              <View style={styles.emptyChip}>
                <Text style={styles.emptyTitle}>No events around this area</Text>
                <Text style={styles.emptyCopy}>Try another address or refresh the list.</Text>
              </View>
            ) : (
              sortedPins.map((event) => (
                <EventPreviewChip
                  key={event.id}
                  event={event}
                  selected={selectedEvent?.id === event.id}
                  onFocus={() => setSelectedEventId(event.id)}
                  onOpen={() => navigateToEvent(event)}
                />
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

function HeaderButton({ icon }: { icon: IoniconName }) {
  return (
    <Pressable style={styles.headerButton}>
      <Ionicons name={icon} size={17} color="rgba(255,255,255,0.62)" />
    </Pressable>
  );
}

function StatPill({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <View style={styles.statPill}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.statText}>{value} {label}</Text>
    </View>
  );
}

function EventMapPin({
  event,
  onPress,
  selected,
}: {
  event: EventPin;
  onPress: () => void;
  selected: boolean;
}) {
  const meta = STATUS_META[event.status];
  const countLabel = getCountLabel(event);

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.pin,
        {
          left: `${event.x}%`,
          top: `${event.y}%`,
          transform: [{ translateX: -28 }, { translateY: -42 }, { scale: selected ? 1.08 : 1 }],
        },
      ]}
    >
      {event.status === 'open' || event.status === 'hidden' ? (
        <View style={[styles.pinPulse, { backgroundColor: meta.pulse, borderColor: meta.border }]} />
      ) : null}
      <View style={[styles.pinBubble, { backgroundColor: meta.bg, borderColor: meta.border }]}>
        <View style={[styles.pinIcon, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon} size={12} color={meta.color} />
        </View>
        <Text numberOfLines={1} style={[styles.pinLabel, { color: meta.color }]}>
          {event.status === 'hidden' ? 'Hidden' : meta.legend}
          {countLabel ? ` - ${countLabel}` : ''}
        </Text>
      </View>
    </Pressable>
  );
}

function EventPreviewChip({
  event,
  onFocus,
  onOpen,
  selected,
}: {
  event: EventPin;
  onFocus: () => void;
  onOpen: () => void;
  selected: boolean;
}) {
  const meta = STATUS_META[event.status];
  const hidden = event.status === 'hidden';

  return (
    <Pressable
      onPress={onFocus}
      onLongPress={onOpen}
      style={[
        styles.eventChip,
        { borderColor: selected ? meta.border : 'rgba(255,255,255,0.10)' },
        selected && styles.eventChipSelected,
      ]}
    >
      <View style={styles.chipTop}>
        <View style={[styles.chipBadge, { backgroundColor: meta.bg, borderColor: meta.border }]}>
          <Ionicons name={meta.icon} size={10} color={meta.color} />
          <Text style={[styles.chipBadgeText, { color: meta.color }]}>{meta.label}</Text>
        </View>
        <Text style={styles.distanceText}>{formatDistance(event.distanceKm)}</Text>
      </View>

      <Text numberOfLines={1} style={[styles.chipTitle, hidden && styles.hiddenChipTitle]}>
        {hidden ? maskTitle(event.title) : event.title}
      </Text>

      <View style={styles.chipMeta}>
        <MetaItem icon={event.status === 'hidden' ? 'eye-outline' : 'calendar-outline'} text={getTimeLabel(event)} />
        <MetaItem icon="people-outline" text={getCountLabel(event) || 'No cap'} />
      </View>

      <Pressable onPress={onOpen} style={styles.openButton}>
        <Text style={styles.openButtonText}>{event.status === 'open' ? 'Start' : 'Brief'}</Text>
        <Ionicons name="chevron-forward" size={13} color="#FFFFFF" />
      </Pressable>
    </Pressable>
  );
}

function MetaItem({ icon, text }: { icon: IoniconName; text: string }) {
  return (
    <View style={styles.metaItem}>
      <Ionicons name={icon} size={11} color="rgba(255,255,255,0.34)" />
      <Text numberOfLines={1} style={styles.metaText}>{text}</Text>
    </View>
  );
}

function MapSketch({ zoom }: { zoom: number }) {
  return (
    <View style={[styles.mapSketch, { transform: [{ scale: zoom }] }]}>
      <View style={[styles.roadWide, styles.roadA]} />
      <View style={[styles.road, styles.roadA]} />
      <View style={[styles.roadWide, styles.roadB]} />
      <View style={[styles.road, styles.roadB]} />
      <View style={[styles.road, styles.roadC]} />
      <View style={[styles.roadThin, styles.roadD]} />
      {BUILDINGS.map((building, index) => (
        <View key={`${building.left}-${index}`} style={[styles.building, building]} />
      ))}
    </View>
  );
}

const BUILDINGS = [
  { left: '8%', top: '34%', width: 48, height: 28 },
  { left: '30%', top: '31%', width: 34, height: 20 },
  { left: '62%', top: '36%', width: 58, height: 36 },
  { left: '42%', top: '57%', width: 42, height: 24 },
  { left: '76%', top: '60%', width: 52, height: 32 },
  { left: '14%', top: '66%', width: 40, height: 22 },
  { left: '64%', top: '73%', width: 46, height: 28 },
] as const;

function buildPins(events: RunEvent[], center: LatLng, zoom: number): EventPin[] {
  return events.map((event, index) => {
    const fallback = FALLBACK_POSITIONS[index % FALLBACK_POSITIONS.length] ?? FALLBACK_POSITIONS[0]!;
    if (event.lat != null && event.lng != null) {
      const distanceKm = haversineKm(center.latitude, center.longitude, event.lat, event.lng);
      const x = clamp(50 + (event.lng - center.longitude) * 900 * zoom, 8, 90);
      const y = clamp(50 - (event.lat - center.latitude) * 1200 * zoom, 18, 78);

      return { ...event, x, y, distanceKm };
    }

    return {
      ...event,
      x: fallback.x,
      y: fallback.y,
      distanceKm: event.distanceKm ?? fallback.distanceKm,
    };
  });
}

function statusRank(status: EventStatus) {
  switch (status) {
    case 'open':
      return 0;
    case 'full':
      return 1;
    case 'hidden':
      return 2;
    case 'completed':
      return 3;
    default:
      return 4;
  }
}

function getCountLabel(event: RunEvent) {
  if (event.maxParticipants > 0) {
    return `${event.registeredCount}/${event.maxParticipants}`;
  }

  if (event.registeredCount > 0) {
    return `${event.registeredCount} reg.`;
  }

  return null;
}

function getTimeLabel(event: RunEvent) {
  if (event.status === 'hidden' && event.revealDate) {
    return `Reveals ${formatDate(event.revealDate)}`;
  }

  if (event.status === 'completed') {
    return `Done ${formatDate(event.startDate)}`;
  }

  return `Starts ${formatDate(event.startDate)}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDistance(distanceKm: number | null) {
  if (distanceKm == null) return 'Nearby';
  return distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`;
}

function maskTitle(title: string) {
  const words = title.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'Hidden route';
  return words.map((word) => '*'.repeat(Math.min(Math.max(word.length, 3), 8))).join(' ');
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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0A0A0F',
    overflow: 'hidden',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 10,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    lineHeight: 25,
    fontFamily: fonts.syne800,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(10,10,15,0.85)',
  },
  searchBar: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(10,10,15,0.88)',
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: fonts.dmSans400,
    paddingVertical: 0,
  },
  searchSubmit: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  searchSubmitText: {
    fontSize: 11,
    fontFamily: fonts.dmSans600,
    color: 'rgba(255,255,255,0.64)',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  legendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(10,10,15,0.82)',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontFamily: fonts.dmSans600,
    color: 'rgba(255,255,255,0.70)',
  },
  mapWrap: {
    flex: 1,
    minHeight: 560,
    backgroundColor: '#141820',
    overflow: 'hidden',
  },
  mapSketch: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#141820',
  },
  roadWide: {
    position: 'absolute',
    height: 28,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  road: {
    position: 'absolute',
    height: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  roadThin: {
    position: 'absolute',
    height: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.055)',
  },
  roadA: {
    left: '-8%',
    right: '-8%',
    top: '27%',
    transform: [{ rotate: '-4deg' }],
  },
  roadB: {
    width: '120%',
    left: '-20%',
    top: '54%',
    transform: [{ rotate: '7deg' }],
  },
  roadC: {
    width: '120%',
    left: '-9%',
    top: '44%',
    transform: [{ rotate: '83deg' }],
  },
  roadD: {
    width: '95%',
    left: '32%',
    top: '48%',
    transform: [{ rotate: '101deg' }],
  },
  building: {
    position: 'absolute',
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  userRadius: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 120,
    height: 120,
    marginLeft: -60,
    marginTop: -60,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: 'rgba(78,204,163,0.08)',
  },
  userRadiusOuter: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 220,
    height: 220,
    marginLeft: -110,
    marginTop: -110,
    borderRadius: 110,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(78,204,163,0.06)',
  },
  userDotOuter: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 20,
    height: 20,
    marginLeft: -10,
    marginTop: -10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(78,204,163,0.45)',
    backgroundColor: 'rgba(78,204,163,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDotInner: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#4ECCA3',
  },
  pin: {
    position: 'absolute',
    zIndex: 12,
  },
  pinPulse: {
    position: 'absolute',
    left: 15,
    top: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
  },
  pinBubble: {
    minHeight: 32,
    maxWidth: 148,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pinIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinLabel: {
    flexShrink: 1,
    fontSize: 12,
    fontFamily: fonts.dmSans600,
    fontWeight: '700',
  },
  controls: {
    position: 'absolute',
    right: 14,
    top: '39%',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(10,10,15,0.85)',
    overflow: 'hidden',
    zIndex: 20,
  },
  controlButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locateButton: {
    backgroundColor: 'rgba(78,204,163,0.10)',
  },
  controlDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  controlGap: {
    height: 6,
  },
  stateOverlay: {
    position: 'absolute',
    top: 170,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(10,10,15,0.86)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    zIndex: 26,
  },
  stateText: {
    fontSize: 12,
    fontFamily: fonts.dmSans600,
    color: 'rgba(255,255,255,0.70)',
  },
  errorOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 170,
    zIndex: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.30)',
    backgroundColor: 'rgba(248,113,113,0.12)',
    padding: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.dmSans400,
    color: '#F87171',
  },
  retryButton: {
    borderRadius: 8,
    backgroundColor: 'rgba(248,113,113,0.16)',
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  retryText: {
    fontSize: 12,
    fontFamily: fonts.dmSans600,
    color: '#F87171',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 28,
  },
  sheetFade: {
    paddingTop: 42,
    backgroundColor: 'rgba(10,10,15,0.96)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  handleWrap: {
    alignItems: 'center',
    paddingBottom: 6,
  },
  handle: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  sheetMeta: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
  },
  sheetTitle: {
    fontSize: 13,
    fontFamily: fonts.dmSans600,
    color: 'rgba(255,255,255,0.68)',
  },
  sheetLocation: {
    marginTop: 2,
    fontSize: 11,
    fontFamily: fonts.dmSans400,
    color: 'rgba(255,255,255,0.34)',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  statText: {
    fontSize: 10,
    fontFamily: fonts.dmSans600,
    color: 'rgba(255,255,255,0.55)',
  },
  eventsScroll: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
  },
  eventChip: {
    width: 220,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: 'rgba(12,10,20,0.92)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  eventChipSelected: {
    backgroundColor: 'rgba(18,14,32,0.98)',
  },
  chipTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  chipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipBadgeText: {
    fontSize: 10,
    fontFamily: fonts.dmSans600,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  distanceText: {
    fontSize: 11,
    fontFamily: fonts.dmSans400,
    color: 'rgba(255,255,255,0.35)',
  },
  chipTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: fonts.dmSans600,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  hiddenChipTitle: {
    color: 'rgba(255,255,255,0.22)',
    letterSpacing: 1.2,
  },
  chipMeta: {
    gap: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    flexShrink: 1,
    fontSize: 11,
    fontFamily: fonts.dmSans400,
    color: 'rgba(255,255,255,0.38)',
  },
  openButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  openButtonText: {
    fontSize: 11,
    fontFamily: fonts.dmSans600,
    color: '#FFFFFF',
  },
  emptyChip: {
    width: 260,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(12,10,20,0.92)',
    padding: 16,
    gap: 5,
  },
  emptyTitle: {
    fontSize: 14,
    fontFamily: fonts.dmSans600,
    color: '#FFFFFF',
  },
  emptyCopy: {
    fontSize: 12,
    fontFamily: fonts.dmSans400,
    color: 'rgba(255,255,255,0.42)',
  },
});
