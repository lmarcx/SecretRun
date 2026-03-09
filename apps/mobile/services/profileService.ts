import { ClientError, gql } from 'graphql-request';
import { nhost } from './nhostClient';
import { requestGraphql } from './graphqlClient';

export interface CurrentProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
}

const CURRENT_PROFILE_QUERY = gql`
  query CurrentProfile($userId: uuid!) {
    profiles_by_pk(id: $userId) {
      id
      username
      display_name
      avatar_url
      created_at
    }
  }
`;

interface CurrentProfileQuery {
  profiles_by_pk: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    created_at: string;
  } | null;
}

export async function fetchCurrentProfile(): Promise<CurrentProfile | null> {
  const userId = nhost.auth.getUser()?.id;
  if (!userId) {
    return null;
  }

  const response = await requestGraphql<CurrentProfileQuery>(CURRENT_PROFILE_QUERY, {
    userId,
  });

  if (!response.profiles_by_pk) {
    return null;
  }

  return {
    id: response.profiles_by_pk.id,
    username: response.profiles_by_pk.username,
    displayName: response.profiles_by_pk.display_name,
    avatarUrl: response.profiles_by_pk.avatar_url,
    createdAt: response.profiles_by_pk.created_at,
  };
}

export function getProfileErrorMessage(error: unknown): string {
  if (error instanceof ClientError) {
    const firstMessage = error.response.errors?.[0]?.message;
    if (firstMessage) {
      return firstMessage;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong while loading your profile.';
}
