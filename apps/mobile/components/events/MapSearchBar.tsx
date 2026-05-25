import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { fonts } from '@/theme/tokens';

interface GeoResult {
  latitude: number;
  longitude: number;
}

interface MapSearchBarProps {
  onGeocode?: ((coords: GeoResult) => void) | undefined;
}

export function MapSearchBar({ onGeocode }: MapSearchBarProps) {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleSubmit = async () => {
    const query = value.trim();
    if (!query || !onGeocode) return;
    setLoading(true);
    try {
      const results = await Location.geocodeAsync(query);
      const first = results[0];
      if (first) {
        onGeocode({ latitude: first.latitude, longitude: first.longitude });
        inputRef.current?.blur();
      }
    } catch {
      // geocode failed silently — user stays on current view
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setValue('');
    inputRef.current?.blur();
  };

  return (
    <View style={styles.bar}>
      <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.35)" />
      <TextInput
        ref={inputRef}
        style={styles.input}
        placeholder="Search area..."
        placeholderTextColor="rgba(255,255,255,0.25)"
        value={value}
        onChangeText={setValue}
        returnKeyType="search"
        onSubmitEditing={handleSubmit}
      />
      {loading ? (
        <ActivityIndicator size="small" color="rgba(255,255,255,0.35)" />
      ) : value.length > 0 ? (
        <Pressable onPress={clear} hitSlop={8}>
          <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.35)" />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(12,10,20,0.88)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.dmSans400,
    color: '#fff',
    paddingVertical: 0,
  },
});
