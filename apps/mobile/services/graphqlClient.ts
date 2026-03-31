import { GraphQLClient } from 'graphql-request';
import { getGraphqlUrl, nhost, nhostConfig } from './nhostClient';

let graphqlClient: GraphQLClient | null = null;
export const PUBLIC_GRAPHQL_CONFIG_ERROR_MESSAGE =
  'Set EXPO_PUBLIC_HASURA_GRAPHQL_URL or EXPO_PUBLIC_NHOST_SUBDOMAIN + EXPO_PUBLIC_NHOST_REGION to load public GraphQL data in mobile.';

function getGraphqlClient() {
  if (!nhostConfig.isGraphqlEnabled) {
    throw new Error(nhostConfig.graphqlDisabledMessage ?? PUBLIC_GRAPHQL_CONFIG_ERROR_MESSAGE);
  }

  if (!graphqlClient) {
    graphqlClient = new GraphQLClient(getGraphqlUrl());
  }

  return graphqlClient;
}

export async function requestGraphql<TData>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<TData> {
  const accessToken = nhost.auth.getAccessToken();
  const client = getGraphqlClient();

  try {
    if (accessToken) {
      return await client.request<TData, Record<string, unknown>>(query, variables, {
        Authorization: `Bearer ${accessToken}`,
      });
    }

    return await client.request<TData, Record<string, unknown>>(query, variables);
  } catch (error) {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (message.includes('network request failed') || message.includes('fetch failed')) {
        throw new Error('Secret Run could not reach the service right now. Try again in a moment.');
      }
    }

    throw error;
  }
}

export function isPublicGraphqlConfigError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.includes(PUBLIC_GRAPHQL_CONFIG_ERROR_MESSAGE) ||
      error.message.includes('load public GraphQL data in mobile'))
  );
}

export async function requestPublicGraphql<TData>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<TData> {
  const client = getGraphqlClient();

  try {
    return await client.request<TData, Record<string, unknown>>(query, variables);
  } catch (error) {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (message.includes('network request failed') || message.includes('fetch failed')) {
        throw new Error('Secret Run could not reach the service right now. Try again in a moment.');
      }
    }

    throw error;
  }
}
