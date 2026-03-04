import { GraphQLClient, gql } from 'graphql-request';

interface Input {
  user_id: string;
  target_user_id: string;
  rating_id: string;
}

const getLedgerQuery = gql`
  query GetLedger($referenceKey: String!) {
    wallet_ledger(where: { reference_key: { _eq: $referenceKey } }, limit: 1) {
      id
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
        transaction_type: rating_reward
        reference_key: $referenceKey
        metadata: $metadata
      }
    ) {
      id
    }
  }
`;

function rewardAmount(): number {
  return Number(process.env.RATING_REWARD_AMOUNT ?? '1');
}

export default async function handler(req: { body?: Input }) {
  const url = process.env.NHOST_GRAPHQL_URL;
  const adminSecret = process.env.NHOST_ADMIN_SECRET;

  if (!url || !adminSecret) {
    throw new Error('NHOST_GRAPHQL_URL and NHOST_ADMIN_SECRET are required');
  }

  const payload = req.body;
  if (!payload?.user_id || !payload?.target_user_id || !payload?.rating_id) {
    return { success: false, error: 'user_id, target_user_id and rating_id are required' };
  }

  const referenceKey = `rating:${payload.rating_id}`;

  const client = new GraphQLClient(url, {
    headers: { 'x-hasura-admin-secret': adminSecret },
  });

  const ledger = await client.request<{ wallet_ledger: Array<{ id: string }> }>(getLedgerQuery, {
    referenceKey,
  });

  if (ledger.wallet_ledger.length > 0) {
    return { success: true, already_rewarded: true, reference_key: referenceKey };
  }

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
    reason: `rating:${payload.rating_id}`,
    referenceKey,
    metadata: {
      user_id: payload.user_id,
      target_user_id: payload.target_user_id,
      rating_id: payload.rating_id,
    },
  });

  return {
    success: true,
    transaction_type: 'rating_reward',
    amount,
    balance: wallet.balance,
    reference_key: referenceKey,
  };
}
