import { GraphQLClient, gql } from 'graphql-request';

const getPendingJobsQuery = gql`
  query PendingJobs($limit: Int!) {
    notification_jobs(
      where: { status: { _eq: pending } }
      order_by: { created_at: asc }
      limit: $limit
    ) {
      id
      user_id
      title
      body
      data
    }
  }
`;

const getDevicesQuery = gql`
  query Devices($userId: uuid!) {
    user_devices(where: { user_id: { _eq: $userId } }) {
      push_token
    }
  }
`;

const markSentMutation = gql`
  mutation MarkSent($id: uuid!, $sentAt: timestamptz!) {
    update_notification_jobs_by_pk(
      pk_columns: { id: $id }
      _set: { status: sent, sent_at: $sentAt, error: null }
    ) {
      id
    }
  }
`;

const markFailedMutation = gql`
  mutation MarkFailed($id: uuid!, $error: String!) {
    update_notification_jobs_by_pk(
      pk_columns: { id: $id }
      _set: { status: failed, error: $error }
    ) {
      id
    }
  }
`;

function getExpoPushUrl(): string {
  return process.env.EXPO_PUSH_API_URL ?? 'https://exp.host/--/api/v2/push/send';
}

async function sendToTokens(tokens: string[], title: string, body: string, data: unknown): Promise<void> {
  if (tokens.length === 0) {
    return;
  }

  const response = await fetch(getExpoPushUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(
      tokens.map((token) => ({
        to: token,
        title,
        body,
        data,
        sound: 'default',
      })),
    ),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Expo push error: ${response.status} ${text}`);
  }
}

export default async function handler() {
  const url = process.env.NHOST_GRAPHQL_URL;
  const adminSecret = process.env.NHOST_ADMIN_SECRET;

  if (!url || !adminSecret) {
    throw new Error('NHOST_GRAPHQL_URL and NHOST_ADMIN_SECRET are required');
  }

  const client = new GraphQLClient(url, {
    headers: { 'x-hasura-admin-secret': adminSecret },
  });

  const jobs = await client.request<{
    notification_jobs: Array<{ id: string; user_id: string; title: string; body: string; data: unknown }>;
  }>(getPendingJobsQuery, {
    limit: 50,
  });

  let sent = 0;
  let failed = 0;

  for (const job of jobs.notification_jobs) {
    try {
      const devices = await client.request<{ user_devices: Array<{ push_token: string }> }>(getDevicesQuery, {
        userId: job.user_id,
      });

      const tokens = devices.user_devices.map((d) => d.push_token);
      await sendToTokens(tokens, job.title, job.body, job.data);

      await client.request(markSentMutation, {
        id: job.id,
        sentAt: new Date().toISOString(),
      });

      sent += 1;
    } catch (error) {
      await client.request(markFailedMutation, {
        id: job.id,
        error: error instanceof Error ? error.message : 'Unknown send error',
      });
      failed += 1;
    }
  }

  return {
    success: true,
    processed: jobs.notification_jobs.length,
    sent,
    failed,
  };
}
