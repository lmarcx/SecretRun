import { createDecipheriv, createHash } from 'node:crypto';
import { GraphQLClient, gql } from 'graphql-request';

interface EncryptedPayload {
  iv: string;
  content: string;
  tag: string;
}

interface RoutePayload {
  geometry: unknown;
  distance_m: number;
  duration_sec: number;
}

const pendingRoutesQuery = gql`
  query PendingRoutes($now: timestamptz!) {
    event_routes(where: { revealed: { _eq: false }, event: { reveal_at: { _lt: $now } } }) {
      event_id
      route_encrypted
    }
  }
`;

const publishRouteMutation = gql`
  mutation PublishRoute($eventId: uuid!, $polyline: String!, $now: timestamptz!) {
    update_event_routes(
      where: { event_id: { _eq: $eventId }, revealed: { _eq: false } }
      _set: { route_polyline: $polyline, revealed: true, revealed_at: $now }
    ) {
      affected_rows
    }
  }
`;

function getEncryptionKey(): Buffer {
  const secret = process.env.ROUTE_ENCRYPTION_SECRET ?? process.env.NHOST_ADMIN_SECRET;
  if (!secret) {
    throw new Error('ROUTE_ENCRYPTION_SECRET or NHOST_ADMIN_SECRET is required for decryption');
  }

  return createHash('sha256').update(secret).digest();
}

function decryptRoutePayload(encryptedText: string): RoutePayload {
  const parsed = JSON.parse(encryptedText) as EncryptedPayload;
  const iv = Buffer.from(parsed.iv, 'base64');
  const content = Buffer.from(parsed.content, 'base64');
  const tag = Buffer.from(parsed.tag, 'base64');

  const decipher = createDecipheriv('aes-256-gcm', getEncryptionKey(), iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(content), decipher.final()]).toString('utf8');
  return JSON.parse(decrypted) as RoutePayload;
}

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

  const pending = await client.request<{
    event_routes: Array<{ event_id: string; route_encrypted: string }>;
  }>(pendingRoutesQuery, { now });

  let revealedCount = 0;

  for (const route of pending.event_routes) {
    const decrypted = decryptRoutePayload(route.route_encrypted);
    const polyline = JSON.stringify(decrypted.geometry);

    const update = await client.request<{ update_event_routes: { affected_rows: number } }>(
      publishRouteMutation,
      {
        eventId: route.event_id,
        polyline,
        now,
      },
    );

    revealedCount += update.update_event_routes.affected_rows;
  }

  return {
    success: true,
    scanned: pending.event_routes.length,
    revealed: revealedCount,
  };
}
