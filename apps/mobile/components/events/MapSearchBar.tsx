import { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '@/theme/tokens';

interface MapSearchBarProps {
  onSearch?: ((query: string) => void) | undefined;
}

export function MapSearchBar({ onSearch }: MapSearchBarProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<TextInput>(null);

  const handleChange = (text: string) => {
    setValue(text);
    onSearch?.(text);
  };

  const clear = () => {
    setValue('');
    onSearch?.('');
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
        onChangeText={handleChange}
        returnKeyType="search"
      />
      {value.length > 0 && (
        <Pressable onPress={clear} hitSlop={8}>
          <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.35)" />
        </Pressable>
      )}
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
