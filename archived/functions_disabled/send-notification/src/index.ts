import { GraphQLClient, gql } from 'graphql-request';

interface Input {
  user_id: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

interface RequestWithHeaders {
  body?: Input;
  headers?: Record<string, string | string[] | undefined>;
}

const getDevicesQuery = gql`
  query GetDevices($userId: uuid!) {
    user_devices(where: { user_id: { _eq: $userId } }) {
      push_token
      platform
    }
  }
`;

function getExpoPushUrl(): string {
  return process.env.EXPO_PUSH_API_URL ?? 'https://exp.host/--/api/v2/push/send';
}

function getHeaderValue(
  headers: Record<string, string | string[] | undefined> | undefined,
  name: string,
): string | null {
  const direct = headers?.[name] ?? headers?.[name.toLowerCase()] ?? headers?.[name.toUpperCase()];
  if (!direct) {
    return null;
  }

  return Array.isArray(direct) ? direct[0] : direct;
}

function isVerifiedSender(req: RequestWithHeaders, adminSecret: string): boolean {
  const adminHeader =
    getHeaderValue(req.headers, 'x-hasura-admin-secret') ?? getHeaderValue(req.headers, 'X-Hasura-Admin-Secret');
  if (adminHeader === adminSecret) {
    return true;
  }

  const userId =
    getHeaderValue(req.headers, 'x-hasura-user-id') ?? getHeaderValue(req.headers, 'X-Hasura-User-Id');
  return Boolean(userId && userId === req.body?.user_id);
}

function splitChunks<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export default async function handler(req: RequestWithHeaders) {
  const url = process.env.NHOST_GRAPHQL_URL;
  const adminSecret = process.env.NHOST_ADMIN_SECRET;

  if (!url || !adminSecret) {
    throw new Error('NHOST_GRAPHQL_URL and NHOST_ADMIN_SECRET are required');
  }

  const payload = req.body;
  if (!payload?.user_id || !payload?.title || !payload?.body) {
    return { success: false, error: 'user_id, title and body are required' };
  }

  if (!isVerifiedSender(req, adminSecret)) {
    return { success: false, error: 'Notification target could not be verified.' };
  }

  const client = new GraphQLClient(url, {
    headers: { 'x-hasura-admin-secret': adminSecret },
  });

  const devicesResponse = await client.request<{ user_devices: Array<{ push_token: string; platform: string }> }>(
    getDevicesQuery,
    {
      userId: payload.user_id,
    },
  );

  const tokens = devicesResponse.user_devices.map((d) => d.push_token);
  if (tokens.length === 0) {
    return { success: true, sent: 0, reason: 'No registered device' };
  }

  const chunks = splitChunks(tokens, 100);
  const tickets: unknown[] = [];

  for (const chunk of chunks) {
    const messages = chunk.map((token) => ({
      to: token,
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
      sound: 'default',
    }));

    const response = await fetch(getExpoPushUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const json = (await response.json()) as { data?: unknown[] };
    if (!response.ok) {
      return {
        success: false,
        error: 'Expo push send failed',
        details: json,
      };
    }

    tickets.push(...(json.data ?? []));
  }

  return {
    success: true,
    sent: tokens.length,
    tickets,
  };
}
