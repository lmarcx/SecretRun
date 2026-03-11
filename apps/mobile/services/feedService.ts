import { ClientError, gql } from 'graphql-request';
import { nhost } from './nhostClient';
import { requestGraphql } from './graphqlClient';

export interface FeedActivityItem {
  id: string;
  createdAt: string;
  status: string;
  points: number;
  distanceKm: number;
  durationSeconds: number;
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
  message: string | null;
  items: FeedActivityItem[];
}

const FEED_QUERY = gql`
  query FeedScreen($userId: uuid!, $limit: Int!) {
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
      message: 'Activity feed currently requires a signed-in profile because activities are private in the current backend schema.',
      items: [],
    };
  }

  const response = await requestGraphql<FeedQuery>(FEED_QUERY, {
    userId: currentUserId,
    limit,
  });

  return {
    requiresAuth: false,
    message: 'Showing your recent backend activities. Shared social feed will expand when broader feed permissions are ready.',
    items: response.activities.map((activity) => ({
      id: activity.id,
      createdAt: activity.created_at,
      status: activity.status,
      points: activity.points ?? 0,
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
  };
}

export function getFeedErrorMessage(error: unknown): string {
  if (error instanceof ClientError) {
    const firstMessage = error.response.errors?.[0]?.message;
    if (firstMessage) {
      return firstMessage;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong while loading the activity feed.';
}
