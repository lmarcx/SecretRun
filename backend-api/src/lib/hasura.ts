import { GraphQLClient } from 'graphql-request';
import { env } from '../config/env';

const hasuraClient = new GraphQLClient(env.HASURA_GRAPHQL_URL, {
  headers: {
    'x-hasura-admin-secret': env.HASURA_ADMIN_SECRET,
  },
});

export async function requestHasura<TData, TVariables extends Record<string, unknown> = Record<string, unknown>>(
  query: string,
  variables?: TVariables,
): Promise<TData> {
  if (variables) {
    return hasuraClient.request<TData>(query, variables);
  }

  return hasuraClient.request<TData>(query);
}
