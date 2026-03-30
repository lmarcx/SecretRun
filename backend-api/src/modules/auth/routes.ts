import type { FastifyInstance } from 'fastify';
import { gql } from 'graphql-request';
import { requestHasura } from '../../lib/hasura';
import { requireAuth } from './plugin';

const ME_QUERY = gql`
  query Me($userId: uuid!) {
    profiles_by_pk(id: $userId) {
      id
      username
      display_name
      avatar_url
      created_at
    }
  }
`;

interface MeQuery {
  profiles_by_pk: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    created_at: string;
  } | null;
}

export async function authRoutes(app: FastifyInstance) {
  app.get('/me', { preHandler: requireAuth }, async (request) => {
    const auth = request.auth!;
    const response = await requestHasura<MeQuery>(ME_QUERY, {
      userId: auth.userId,
    });

    return {
      user: {
        id: auth.userId,
        email: typeof auth.payload.email === 'string' ? auth.payload.email : null,
        roles: auth.hasuraClaims?.['x-hasura-allowed-roles'] ?? [],
        defaultRole: auth.hasuraClaims?.['x-hasura-default-role'] ?? null,
      },
      profile: response.profiles_by_pk
        ? {
            id: response.profiles_by_pk.id,
            username: response.profiles_by_pk.username,
            displayName: response.profiles_by_pk.display_name,
            avatarUrl: response.profiles_by_pk.avatar_url,
            createdAt: response.profiles_by_pk.created_at,
          }
        : null,
    };
  });
}
