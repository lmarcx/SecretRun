import { useLocalSearchParams } from 'expo-router';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function RunScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();

  return <PlaceholderScreen title="Run" subtitle={`Live run tracker for event ${eventId ?? ''}.`} />;
}
