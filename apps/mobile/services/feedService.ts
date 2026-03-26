import { ClientError, gql } from 'graphql-request';
import { nhost } from './nhostClient';
import { requestGraphql } from './graphqlClient';

export type FeedActivityType = 'joined_event' | 'completed_run' | 'result_available';

export interface FeedActivityItem {
  id: string;
  type: FeedActivityType;
  createdAt: string;
  status: string | null;
  points: number | null;
  distanceKm: number | null;
  durationSeconds: number | null;
  avgSpeedKmh: number | null;
  event: {
    id: string;
    title: string;
  } | null;
  profile: {
    displayName: string | null;
    username: string | null;
    avatarUrl: string | null;
  } | null;
}

export interface FeedData {
  requiresAuth: boolean;
  items: FeedActivityItem[];
}

const FEED_QUERY = gql`
  query FeedScreen($userId: uuid!, $limit: Int!) {
    event_participants(
      where: { user_id: { _eq: $userId } }
      order_by: [{ joined_at: desc }, { event_id: desc }]
      limit: $limit
    ) {
      event_id
      joined_at
      status
      event {
        id
        title
      }
      profile {
        display_name
        username
        avatar_url
      }
    }
    activities(
      where: { user_id: { _eq: $userId } }
      order_by: [{ created_at: desc }, { id: desc }]
      limit: $limit
    ) {
      id
      created_at
      status
      points
      distance_km
      duration_seconds
      avg_speed_kmh
      event {
        id
        title
      }
      profile {
        display_name
        username
        avatar_url
      }
    }
  }
`;

interface FeedQuery {
  event_participants: Array<{
    event_id: string;
    joined_at: string;
    status: string;
    event: {
      id: string;
      title: string;
    } | null;
    profile: {
      display_name: string | null;
      username: string | null;
      avatar_url: string | null;
    } | null;
  }>;
  activities: Array<{
    id: string;
    created_at: string;
    status: string;
    points: number | null;
    distance_km: number | string;
    duration_seconds: number;
    avg_speed_kmh: number | string | null;
    event: {
      id: string;
      title: string;
    } | null;
    profile: {
      display_name: string | null;
      username: string | null;
      avatar_url: string | null;
    } | null;
  }>;
}

export async function fetchFeed(limit = 20): Promise<FeedData> {
  const currentUserId = nhost.auth.getUser()?.id ?? null;

  if (!currentUserId) {
    return {
      requiresAuth: true,
      items: [],
    };
  }

  const response = await requestGraphql<FeedQuery>(FEED_QUERY, {
    userId: currentUserId,
    limit,
  });

  const items: FeedActivityItem[] = [
    ...response.event_participants.map((entry) => ({
      id: `joined-${entry.event_id}-${entry.joined_at}`,
      type: 'joined_event' as const,
      createdAt: entry.joined_at,
      status: entry.status,
      points: null,
      distanceKm: null,
      durationSeconds: null,
      avgSpeedKmh: null,
      event: entry.event,
      profile: entry.profile
        ? {
            displayName: entry.profile.display_name,
            username: entry.profile.username,
            avatarUrl: entry.profile.avatar_url,
          }
        : null,
    })),
    ...response.activities.map((activity) => ({
      id: activity.id,
      type: activity.status === 'pending' ? ('completed_run' as const) : ('result_available' as const),
      createdAt: activity.created_at,
      status: activity.status,
      points: activity.points,
      distanceKm: Number(activity.distance_km),
      durationSeconds: activity.duration_seconds,
      avgSpeedKmh: activity.avg_speed_kmh === null ? null : Number(activity.avg_speed_kmh),
      event: activity.event,
      profile: activity.profile
        ? {
            displayName: activity.profile.display_name,
            username: activity.profile.username,
            avatarUrl: activity.profile.avatar_url,
          }
        : null,
    })),
  ]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, limit);

  return {
    requiresAuth: false,
    items,
  };
}

export function getFeedErrorMessage(error: unknown): string {
  if (error instanceof ClientError) {
    const firstMessage = error.response.errors?.[0]?.message;
    if (firstMessage) {
      return 'We could not load the feed right now.';
    }
  }

  if (error instanceof Error) {
    const lowerMessage = error.message.toLowerCase();
    if (lowerMessage.includes('fetch failed') || lowerMessage.includes('network request failed')) {
      return 'Feed is unavailable right now. Try again in a moment.';
    }
  }

  return 'We could not load the feed right now.';
}
