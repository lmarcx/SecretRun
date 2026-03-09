import { GraphQLClient } from 'graphql-request';
import { getGraphqlUrl, nhost } from './nhostClient';

const graphqlClient = new GraphQLClient(getGraphqlUrl());

export async function requestGraphql<TData, TVariables extends Record<string, unknown>>(
  query: string,
  variables: TVariables,
): Promise<TData> {
  const accessToken = nhost.auth.getAccessToken();
  const requestHeaders: HeadersInit = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  const request = graphqlClient.request as (
    document: string,
    requestVariables: TVariables,
    headers: HeadersInit,
  ) => Promise<TData>;

  return request(query, variables, requestHeaders);
}
