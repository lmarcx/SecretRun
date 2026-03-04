import { GraphQLClient, gql } from 'graphql-request';

const upcomingEventsQuery = gql`
  query UpcomingEvents($from: timestamptz!, $to: timestamptz!) {
    events(where: { starts_at: { _gte: $from, _lt: $to } }) {
      id
      starts_at
      participants {
        user_id
      }
    }
  }
`;

const existingNotificationQuery = gql`
  query ExistingNotification($referenceKey: String!) {
    notification_jobs(where: { reference_key: { _eq: $referenceKey } }, limit: 1) {
      id
    }
  }
`;

const enqueueNotificationMutation = gql`
  mutation EnqueueReminder(
    $userId: uuid!
    $title: String!
    $body: String!
    $data: jsonb!
    $referenceKey: String!
  ) {
    insert_notification_jobs_one(
      object: {
        user_id: $userId
        title: $title
        body: $body
        data: $data
        reference_key: $referenceKey
        status: pending
      }
    ) {
      id
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
    headers: { 'x-hasura-admin-secret': adminSecret },
  });

  const now = new Date();
  const from = new Date(now.getTime() + 30 * 60 * 1000);
  const to = new Date(now.getTime() + 35 * 60 * 1000);

  const events = await client.request<{
    events: Array<{ id: string; starts_at: string; participants: Array<{ user_id: string }> }>;
  }>(upcomingEventsQuery, {
    from: from.toISOString(),
    to: to.toISOString(),
  });

  let enqueued = 0;

  for (const event of events.events) {
    for (const participant of event.participants) {
      const referenceKey = `event-start-30m:${event.id}:${participant.user_id}`;
      const existing = await client.request<{ notification_jobs: Array<{ id: string }> }>(
        existingNotificationQuery,
        { referenceKey },
      );

      if (existing.notification_jobs.length > 0) {
        continue;
      }

      await client.request(enqueueNotificationMutation, {
        userId: participant.user_id,
        title: 'Your run starts in 30 minutes',
        body: 'Get ready. Warm up and head to the start area.',
        data: {
          type: 'event_start_reminder',
          event_id: event.id,
          starts_at: event.starts_at,
        },
        referenceKey,
      });

      enqueued += 1;
    }
  }

  return {
    success: true,
    events: events.events.length,
    enqueued,
  };
}
