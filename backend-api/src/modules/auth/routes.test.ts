import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

process.env.NODE_ENV = 'test';
process.env.HASURA_GRAPHQL_URL ??= 'http://localhost:8080/v1/graphql';
process.env.HASURA_ADMIN_SECRET ??= 'test-secret';
process.env.NHOST_JWT_PUBLIC_KEY ??= 'test-public-key';

const { buildApp } = require('../../app') as {
  buildApp: typeof import('../../app').buildApp;
};
const hasura = require('../../lib/hasura') as {
  requestHasura: typeof import('../../lib/hasura').requestHasura;
};
const jwt = require('./jwt') as {
  verifyAccessToken: typeof import('./jwt').verifyAccessToken;
};
const { resetRateLimitStoreForTests } = require('../../lib/rate-limit') as {
  resetRateLimitStoreForTests: typeof import('../../lib/rate-limit').resetRateLimitStoreForTests;
};

const originalRequestHasura = hasura.requestHasura;
const originalVerifyAccessToken = jwt.verifyAccessToken;

afterEach(() => {
  hasura.requestHasura = originalRequestHasura;
  jwt.verifyAccessToken = originalVerifyAccessToken;
  resetRateLimitStoreForTests();
});

describe('auth routes security', () => {
  it('serves /me with non-cacheable auth headers through the controller', async () => {
    const app = buildApp();

    hasura.requestHasura = (async (_query: string, variables?: Record<string, unknown>) => {
      assert.deepEqual(variables, {
        userId: '11111111-1111-4111-8111-111111111111',
      });

      return {
        profiles_by_pk: {
          id: '11111111-1111-4111-8111-111111111111',
          username: 'runner_one',
          display_name: 'Runner One',
          avatar_url: 'https://cdn.example.com/avatar.png',
          created_at: '2026-04-01T12:00:00.000Z',
        },
      };
    }) as typeof hasura.requestHasura;

    jwt.verifyAccessToken = async (token: string) => {
      assert.equal(token, 'header.payload.signature');
      return {
        token,
        userId: '11111111-1111-4111-8111-111111111111',
        payload: {
          sub: '11111111-1111-4111-8111-111111111111',
          email: 'runner@example.com',
          'https://hasura.io/jwt/claims': {
            'x-hasura-user-id': '11111111-1111-4111-8111-111111111111',
            'x-hasura-default-role': 'user',
            'x-hasura-allowed-roles': ['user'],
          },
        },
        hasuraClaims: {
          'x-hasura-user-id': '11111111-1111-4111-8111-111111111111',
          'x-hasura-default-role': 'user',
          'x-hasura-allowed-roles': ['user'],
        },
      };
    };

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/me',
        headers: {
          Authorization: 'Bearer header.payload.signature',
        },
      });

      assert.equal(response.statusCode, 200);
      assert.equal(response.headers['cache-control'], 'private, no-store, max-age=0');
      assert.equal(response.headers.pragma, 'no-cache');
      assert.equal(response.headers.vary, 'Authorization');
      assert.equal(response.headers['x-content-type-options'], 'nosniff');
      assert.deepEqual(response.json(), {
        user: {
          id: '11111111-1111-4111-8111-111111111111',
          email: 'runner@example.com',
          roles: ['user'],
          defaultRole: 'user',
        },
        betaAccess: {
          allowed: true,
          mode: 'open',
          email: 'runner@example.com',
          reason: 'open',
          message: null,
        },
        profile: {
          id: '11111111-1111-4111-8111-111111111111',
          username: 'runner_one',
          displayName: 'Runner One',
          avatarUrl: 'https://cdn.example.com/avatar.png',
          createdAt: '2026-04-01T12:00:00.000Z',
        },
      });
    } finally {
      await app.close();
    }
  });

  it('rejects oversized authorization headers before JWT verification', async () => {
    const app = buildApp();
    let verifyCallCount = 0;

    jwt.verifyAccessToken = async () => {
      verifyCallCount += 1;
      throw new Error('verifyAccessToken should not be called');
    };

    const oversizedToken = `${'a'.repeat(3000)}.${'b'.repeat(3000)}.${'c'.repeat(3000)}`;

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/me',
        headers: {
          Authorization: `Bearer ${oversizedToken}`,
        },
      });

      assert.equal(response.statusCode, 401);
      assert.equal(response.json().error, 'invalid_authorization');
      assert.equal(response.headers['cache-control'], 'private, no-store, max-age=0');
      assert.equal(verifyCallCount, 0);
    } finally {
      await app.close();
    }
  });

  it('rejects multiple bearer tokens in one authorization header', async () => {
    const app = buildApp();
    let verifyCallCount = 0;

    jwt.verifyAccessToken = async () => {
      verifyCallCount += 1;
      throw new Error('verifyAccessToken should not be called');
    };

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/me',
        headers: {
          Authorization: 'Bearer header.payload.signature, Bearer second.payload.signature',
        },
      });

      assert.equal(response.statusCode, 401);
      assert.equal(response.json().error, 'invalid_authorization');
      assert.equal(verifyCallCount, 0);
    } finally {
      await app.close();
    }
  });

  it('rate limits repeated /me lookups', async () => {
    const app = buildApp();

    hasura.requestHasura = (async () => ({
      profiles_by_pk: null,
    })) as typeof hasura.requestHasura;

    jwt.verifyAccessToken = async (token: string) => ({
      token,
      userId: '11111111-1111-4111-8111-111111111111',
      payload: {
        sub: '11111111-1111-4111-8111-111111111111',
      },
      hasuraClaims: null,
    });

    try {
      for (let attempt = 0; attempt < 30; attempt += 1) {
        const response = await app.inject({
          method: 'GET',
          url: '/me',
          headers: {
            Authorization: 'Bearer header.payload.signature',
          },
        });

        assert.equal(response.statusCode, 200);
      }

      const limitedResponse = await app.inject({
        method: 'GET',
        url: '/me',
        headers: {
          Authorization: 'Bearer header.payload.signature',
        },
      });

      assert.equal(limitedResponse.statusCode, 429);
      assert.equal(limitedResponse.json().error, 'rate_limit_exceeded');
      assert.match(String(limitedResponse.headers['retry-after'] ?? ''), /^[1-9]/);
    } finally {
      await app.close();
    }
  });
});
