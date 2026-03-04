import { GraphQLClient, gql } from 'graphql-request';

const mutation = gql`
  mutation RevealRoutes($now: timestamptz!) {
    update_event_routes(
      where: { revealed: { _eq: false }, event: { reveal_at: { _lte: $now } } }
      _set: { revealed: true, revealed_at: $now }
    ) {
      affected_rows
    }
  }
`;

export default async function handler() {
  const url = process.env.NHOST_GRAPHQL_URL;
  const adminSecret = process.env.NHOST_ADMIN_SECRET;

  if (!url || !adminSecret) {
    throw new Error('NHOST_GRAPHQL_URL and NHOST_ADMIN_SECRET are required');
  }

  const client = new GraphQLClient(url, {
    headers: {
      'x-hasura-admin-secret': adminSecret,
    },
  });

  const now = new Date().toISOString();
  const result = await client.request(mutation, { now });

  return {
    message: 'Routes reveal check completed',
    affectedRows: result.update_event_routes.affected_rows,
  };
}
