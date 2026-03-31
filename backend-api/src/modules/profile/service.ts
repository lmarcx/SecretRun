import { ClientError, gql } from 'graphql-request';
import { AppError } from '../../lib/errors';
import { requestHasura } from '../../lib/hasura';

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
  mutation CreateCurrentProfile($userId: uuid!, $username: String!, $displayName: String!, $avatarUrl: String) {
    insert_profiles_one(
      object: { id: $userId, username: $username, display_name: $displayName, avatar_url: $avatarUrl }
    ) {
      id
      username
      display_name
      avatar_url
      created_at
    }
  }
`;

const CURRENT_PROFILE_STATS_QUERY = gql`
  query CurrentProfileStats($userId: uuid!) {
    validated_runs: activities_aggregate(where: { user_id: { _eq: $userId }, status: { _eq: validated } }) {
      aggregate {
        count
      }
    }
  }
`;

interface ProfileRow {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}

interface CurrentProfileQuery {
  profiles_by_pk: ProfileRow | null;
}

interface CreateCurrentProfileMutation {
  insert_profiles_one: ProfileRow | null;
}

interface CurrentProfileStatsQuery {
  validated_runs: {
    aggregate: {
      count: number;
    } | null;
  };
}

export interface CurrentProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
}

export async function getCurrentProfile(userId: string): Promise<CurrentProfile | null> {
  const response = await requestHasura<CurrentProfileQuery>(CURRENT_PROFILE_QUERY, {
    userId,
  });

  return response.profiles_by_pk ? mapProfile(response.profiles_by_pk) : null;
}

export async function createCurrentProfile(
  userId: string,
  input: {
    username: string;
    displayName: string;
    avatarUrl?: string | null;
  },
): Promise<CurrentProfile> {
  const existingProfile = await getCurrentProfile(userId);
  if (existingProfile) {
    return existingProfile;
  }

  try {
    const response = await requestHasura<CreateCurrentProfileMutation>(CREATE_PROFILE_MUTATION, {
      userId,
      username: input.username,
      displayName: input.displayName,
      avatarUrl: input.avatarUrl ?? null,
    });

    if (!response.insert_profiles_one) {
      throw new AppError(500, 'profile_create_failed', 'Could not create the profile record.');
    }

    return mapProfile(response.insert_profiles_one);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (isDuplicateUsernameError(error)) {
      throw new AppError(409, 'username_taken', 'This username is already taken.');
    }

    if (isProfileAlreadyCreatedError(error)) {
      const profile = await getCurrentProfile(userId);
      if (profile) {
        return profile;
      }
    }

    throw new AppError(500, 'profile_create_failed', 'Could not create the profile record.');
  }
}

export async function getCurrentProfileStats(userId: string): Promise<{ validatedRuns: number }> {
  const response = await requestHasura<CurrentProfileStatsQuery>(CURRENT_PROFILE_STATS_QUERY, {
    userId,
  });

  return {
    validatedRuns: response.validated_runs.aggregate?.count ?? 0,
  };
}

function mapProfile(profile: ProfileRow): CurrentProfile {
  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.display_name,
    avatarUrl: profile.avatar_url,
    createdAt: profile.created_at,
  };
}

function isDuplicateUsernameError(error: unknown): boolean {
  if (error instanceof ClientError) {
    return Boolean(
      error.response.errors?.some((entry) => {
        const message = entry.message.toLowerCase();
        return message.includes('profiles_username_key');
      }),
    );
  }

  return error instanceof Error && error.message.toLowerCase().includes('profiles_username_key');
}

function isProfileAlreadyCreatedError(error: unknown): boolean {
  if (error instanceof ClientError) {
    return Boolean(
      error.response.errors?.some((entry) => {
        const message = entry.message.toLowerCase();
        return message.includes('profiles_pkey');
      }),
    );
  }

  return error instanceof Error && error.message.toLowerCase().includes('profiles_pkey');
}
