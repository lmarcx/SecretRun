import { StyleSheet, Text, View } from 'react-native';
import { fonts } from '@/theme/tokens';

const ITEMS = [
  { label: 'Hidden', bg: 'rgba(130,80,255,0.20)', border: 'rgba(130,80,255,0.50)', text: '#C4A3FF' },
  { label: 'Validated', bg: 'rgba(232,184,75,0.18)', border: 'rgba(232,184,75,0.50)', text: '#F0C84E' },
  { label: 'Live', bg: 'rgba(78,204,163,0.15)', border: 'rgba(78,204,163,0.40)', text: '#5DDDB8' },
  { label: 'Done', bg: 'rgba(96,165,250,0.15)', border: 'rgba(96,165,250,0.40)', text: '#93C5FD' },
] as const;

export function MapLegend() {
  return (
    <View style={styles.row}>
      {ITEMS.map((item) => (
        <View key={item.label} style={[styles.pill, { backgroundColor: item.bg, borderColor: item.border }]}>
          <Text style={[styles.text, { color: item.text }]}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  text: {
    fontSize: 11,
    fontFamily: fonts.dmSans600,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
