import { useEffect, useState } from 'react';
import type { EventRoute } from '@/utils/route';
import { fetchEventRoute } from '@/services/eventRoutes';

interface UseEventRouteState {
  route: EventRoute | null;
  loading: boolean;
  error: string | null;
}

export function useEventRoute(eventId?: string): UseEventRouteState {
  const [route, setRoute] = useState<EventRoute | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (!eventId) {
      setRoute(null);
      setLoading(false);
      setError('Missing event id');
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const value = await fetchEventRoute(eventId);
        if (!isMounted) {
          return;
        }

        if (!value) {
          setError('Route is not available yet.');
          setRoute(null);
        } else {
          setRoute(value);
        }
      } catch (err) {
        if (!isMounted) {
          return;
        }

        const message = err instanceof Error ? err.message : 'Failed to fetch route';
        setError(message);
        setRoute(null);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [eventId]);

  return {
    route,
    loading,
    error,
  };
}
