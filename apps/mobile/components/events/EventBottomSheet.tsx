import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { RunEvent } from '@/types/event';
import { fonts } from '@/theme/tokens';
import { EventChip } from './EventChip';

interface EventBottomSheetProps {
  events: RunEvent[];
  selectedEventId?: string | null | undefined;
  onSelectEvent?: ((id: string) => void) | undefined;
}

export function EventBottomSheet({ events, selectedEventId, onSelectEvent }: EventBottomSheetProps) {
  const sorted = [...events].sort((a, b) => {
    if (a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm;
    if (a.distanceKm != null) return -1;
    if (b.distanceKm != null) return 1;
    return 0;
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Nearby Events</Text>
        <Text style={styles.count}>
          {events.length} run{events.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {events.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No events right now</Text>
        </View>
      ) : (
        <FlatList
          data={sorted}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={232}
          decelerationRate="fast"
          contentContainerStyle={styles.list}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <EventChip
              event={item}
              selected={selectedEventId === item.id}
              onPress={() => onSelectEvent?.(item.id)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 12,
    paddingTop: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 16,
    fontFamily: fonts.syne700,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.2,
  },
  count: {
    fontSize: 12,
    fontFamily: fonts.dmSans400,
    color: 'rgba(255,255,255,0.35)',
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  empty: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: fonts.dmSans400,
    color: 'rgba(255,255,255,0.30)',
  },
});
