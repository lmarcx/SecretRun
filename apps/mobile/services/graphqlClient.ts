import { GraphQLClient } from 'graphql-request';
import { getGraphqlUrl, nhost } from './nhostClient';

const graphqlClient = new GraphQLClient(getGraphqlUrl());

export async function requestGraphql<TData>(
  query: string,
  variables: Record<string, unknown>,
): Promise<TData> {
  const accessToken = nhost.auth.getAccessToken();

  if (accessToken) {
    return graphqlClient.request<TData, Record<string, unknown>>(query, variables, {
      Authorization: `Bearer ${accessToken}`,
    });
  }

  return graphqlClient.request<TData, Record<string, unknown>>(query, variables);
}
