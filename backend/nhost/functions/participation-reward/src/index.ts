import { GraphQLClient, gql } from 'graphql-request';

interface Input {
  event_id: string;
  user_id: string;
}

const getEventAndMembershipQuery = gql`
  query GetEventAndMembership($eventId: uuid!, $userId: uuid!) {
    events_by_pk(id: $eventId) {
      id
      team_id
    }
    team_members(where: { user_id: { _eq: $userId } }) {
      team_id
    }
  }
`;

const getLedgerQuery = gql`
  query GetLedger($referenceKey: String!) {
    wallet_ledger(where: { reference_key: { _eq: $referenceKey } }, limit: 1) {
      id
    }
  }
`;

const ensureParticipantMutation = gql`
  mutation EnsureParticipant($eventId: uuid!, $userId: uuid!, $status: String!) {
    insert_event_participants_one(
      object: { event_id: $eventId, user_id: $userId, status: $status }
      on_conflict: { constraint: event_participants_pkey, update_columns: [status] }
    ) {
      event_id
      user_id
    }
  }
`;

const ensureWalletMutation = gql`
  mutation EnsureWallet($userId: uuid!) {
    insert_wallets_one(
      object: { user_id: $userId, balance: 0 }
      on_conflict: { constraint: wallets_user_id_key, update_columns: [updated_at] }
    ) {
      id
    }
  }
`;

const updateWalletMutation = gql`
  mutation UpdateWallet($userId: uuid!, $delta: Int!, $now: timestamptz!) {
    update_wallets(
      where: { user_id: { _eq: $userId } }
      _inc: { balance: $delta }
      _set: { updated_at: $now }
    ) {
      returning {
        id
        balance
      }
    }
  }
`;

const insertLedgerMutation = gql`
  mutation InsertLedger(
    $walletId: uuid!
    $delta: Int!
    $reason: String!
    $referenceKey: String!
    $metadata: jsonb!
  ) {
    insert_wallet_ledger_one(
      object: {
        wallet_id: $walletId
        delta: $delta
        reason: $reason
        transaction_type: participation_reward
        reference_key: $referenceKey
        metadata: $metadata
      }
    ) {
      id
    }
  }
`;

function rewardAmount(): number {
  return Number(process.env.PARTICIPATION_REWARD_AMOUNT ?? '5');
}

export default async function handler(req: { body?: Input }) {
  const url = process.env.NHOST_GRAPHQL_URL;
  const adminSecret = process.env.NHOST_ADMIN_SECRET;

  if (!url || !adminSecret) {
    throw new Error('NHOST_GRAPHQL_URL and NHOST_ADMIN_SECRET are required');
  }

  const payload = req.body;
  if (!payload?.event_id || !payload?.user_id) {
    return { success: false, error: 'event_id and user_id are required' };
  }

  const referenceKey = `participation:${payload.event_id}:${payload.user_id}`;

  const client = new GraphQLClient(url, {
    headers: { 'x-hasura-admin-secret': adminSecret },
  });

  const eventResponse = await client.request<{
    events_by_pk: { id: string; team_id: string | null } | null;
    team_members: Array<{ team_id: string }>;
  }>(getEventAndMembershipQuery, {
    eventId: payload.event_id,
    userId: payload.user_id,
  });

  const event = eventResponse.events_by_pk;
  if (!event) {
    return { success: false, error: 'Event not found' };
  }

  if (event.team_id) {
    const isTeamMember = eventResponse.team_members.some((m) => m.team_id === event.team_id);
    if (!isTeamMember) {
      return { success: false, error: 'Only team members can join this event' };
    }
  }

  const ledger = await client.request<{ wallet_ledger: Array<{ id: string }> }>(getLedgerQuery, {
    referenceKey,
  });

  if (ledger.wallet_ledger.length > 0) {
    return { success: true, already_rewarded: true, reference_key: referenceKey };
  }

  await client.request(ensureParticipantMutation, {
    eventId: payload.event_id,
    userId: payload.user_id,
    status: 'registered',
  });

  await client.request(ensureWalletMutation, { userId: payload.user_id });

  const amount = rewardAmount();
  const now = new Date().toISOString();

  const walletResponse = await client.request<{
    update_wallets: { returning: Array<{ id: string; balance: number }> };
  }>(updateWalletMutation, {
    userId: payload.user_id,
    delta: amount,
    now,
  });

  const wallet = walletResponse.update_wallets.returning[0];
  if (!wallet) {
    return { success: false, error: 'Wallet update failed' };
  }

  await client.request(insertLedgerMutation, {
    walletId: wallet.id,
    delta: amount,
    reason: `event:${payload.event_id}:participation`,
    referenceKey,
    metadata: {
      event_id: payload.event_id,
      user_id: payload.user_id,
    },
  });

  return {
    success: true,
    transaction_type: 'participation_reward',
    amount,
    balance: wallet.balance,
    reference_key: referenceKey,
  };
}
