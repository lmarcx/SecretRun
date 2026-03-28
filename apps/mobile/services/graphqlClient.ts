import { GraphQLClient } from 'graphql-request';
import { getGraphqlUrl, nhost, nhostConfig } from './nhostClient';

let graphqlClient: GraphQLClient | null = null;

function getGraphqlClient() {
  if (!nhostConfig.isConfigured) {
    throw new Error('Secret Run is not connected to an Nhost Cloud project yet.');
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
