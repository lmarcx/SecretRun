import { GraphQLClient } from 'graphql-request';
import { nhost } from './nhostClient';

const graphqlUrl = process.env.EXPO_PUBLIC_NHOST_GRAPHQL_URL;

if (!graphqlUrl) {
  throw new Error('Missing EXPO_PUBLIC_NHOST_GRAPHQL_URL');
}

const graphqlClient = new GraphQLClient(graphqlUrl);

export async function requestGraphql<TData, TVariables extends Record<string, unknown>>(
  query: string,
  variables: TVariables,
): Promise<TData> {
  const accessToken = nhost.auth.getAccessToken();

  return graphqlClient.request<TData, TVariables>(
    query,
    variables,
    accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  );
}
