import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function EventsScreen() {
  return (
    <PlaceholderScreen title="Events" subtitle="Upcoming runs with hidden routes.">
      <Link href="/events/evt-demo" asChild>
        <Pressable style={styles.button}>
          <Text style={styles.buttonText}>Open demo event</Text>
        </Pressable>
      </Link>
    </PlaceholderScreen>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    minWidth: 220,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
