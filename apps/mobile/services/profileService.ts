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

export interface CreateCurrentProfileInput {
  username: string;
  displayName: string;
  avatarUrl?: string | null;
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

const CREATE_PROFILE_MUTATION = gql`
  mutation CreateCurrentProfile($username: String!, $displayName: String!, $avatarUrl: String) {
    insert_profiles_one(
      object: { username: $username, display_name: $displayName, avatar_url: $avatarUrl }
    ) {
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

interface CreateCurrentProfileMutation {
  insert_profiles_one: {
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

  return mapProfile(response.profiles_by_pk);
}

export async function createCurrentProfile(input: CreateCurrentProfileInput): Promise<CurrentProfile> {
  const userId = nhost.auth.getUser()?.id;
  if (!userId) {
    throw new Error('Sign in before creating a profile.');
  }

  const existingProfile = await fetchCurrentProfile();
  if (existingProfile) {
    return existingProfile;
  }

  const response = await requestGraphql<CreateCurrentProfileMutation>(CREATE_PROFILE_MUTATION, {
    username: input.username,
    displayName: input.displayName,
    avatarUrl: input.avatarUrl ?? null,
  });

  if (!response.insert_profiles_one) {
    throw new Error('Could not create the profile record.');
  }

  return mapProfile(response.insert_profiles_one);
}

function mapProfile(profile: NonNullable<CurrentProfileQuery['profiles_by_pk']>): CurrentProfile {
  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.display_name,
    avatarUrl: profile.avatar_url,
    createdAt: profile.created_at,
  };
}

export function getProfileErrorMessage(error: unknown): string {
  if (error instanceof ClientError) {
    const firstMessage = error.response.errors?.[0]?.message;
    if (firstMessage) {
      const lowerMessage = firstMessage.toLowerCase();
      if (lowerMessage.includes('profiles_username_key') || lowerMessage.includes('duplicate key value')) {
        return 'This username is already taken.';
      }

      return firstMessage;
    }
  }

  if (error instanceof Error) {
    const lowerMessage = error.message.toLowerCase();
    if (lowerMessage.includes('profiles_username_key') || lowerMessage.includes('duplicate key value')) {
      return 'This username is already taken.';
    }

    return error.message;
  }

  return 'Something went wrong while loading your profile.';
}
