import { GraphQLClient } from 'graphql-request';
import { getGraphqlUrl, nhost } from './nhostClient';

const graphqlUrl = getGraphqlUrl();
const graphqlClient = new GraphQLClient(graphqlUrl);

export async function requestGraphql<TData>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<TData> {
  const accessToken = nhost.auth.getAccessToken();

  try {
    if (accessToken) {
      return await graphqlClient.request<TData, Record<string, unknown>>(query, variables, {
        Authorization: `Bearer ${accessToken}`,
      });
    }

    return await graphqlClient.request<TData, Record<string, unknown>>(query, variables);
  } catch (error) {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (message.includes('network request failed') || message.includes('fetch failed')) {
        throw new Error(`Unable to reach GraphQL at ${graphqlUrl}. Check EXPO_PUBLIC_HASURA_GRAPHQL_URL and backend connectivity.`);
      }
    }

    throw error;
  }
}
