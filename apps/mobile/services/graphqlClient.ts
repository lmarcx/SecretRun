import { GraphQLClient } from 'graphql-request';

const graphqlUrl = process.env.EXPO_PUBLIC_NHOST_GRAPHQL_URL;

if (!graphqlUrl) {
  throw new Error('Missing EXPO_PUBLIC_NHOST_GRAPHQL_URL');
}

export const graphqlClient = new GraphQLClient(graphqlUrl);
