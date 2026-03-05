import { GraphQLClient } from 'graphql-request';
import { getGraphqlUrl, nhost } from './nhostClient';

const graphqlClient = new GraphQLClient(getGraphqlUrl());

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
