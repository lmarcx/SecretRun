import assert from 'node:assert/strict';
import path from 'node:path';
import { afterEach, describe, it, mock } from 'node:test';

const backendApiDistFragment = `${path.sep}backend-api${path.sep}dist${path.sep}`;

function resetBackendApiModuleCache() {
  for (const modulePath of Object.keys(require.cache)) {
    if (modulePath.includes(backendApiDistFragment)) {
      delete require.cache[modulePath];
    }
  }
}

function restoreSharedTestEnv() {
  process.env.NODE_ENV = 'test';
  process.env.HASURA_GRAPHQL_URL = 'http://localhost:8080/v1/graphql';
  process.env.HASURA_ADMIN_SECRET = 'test-secret';
  process.env.NHOST_JWT_PUBLIC_KEY = 'test-public-key';
}

function configureDevEnvWithoutJwt() {
  process.env.NODE_ENV = 'development';
  process.env.HASURA_GRAPHQL_URL = 'http://localhost:8080/v1/graphql';
  process.env.HASURA_ADMIN_SECRET = 'test-secret';

  delete process.env.NHOST_SUBDOMAIN;
  delete process.env.NHOST_REGION;
  delete process.env.NHOST_JWKS_URL;
  delete process.env.NHOST_JWT_PUBLIC_KEY;
  delete process.env.NHOST_JWT_ISSUER;
  delete process.env.NHOST_JWT_AUDIENCE;
}

async function buildEventsTestAppWithoutJwt() {
  configureDevEnvWithoutJwt();
  resetBackendApiModuleCache();

  const [{ buildApp }, eventsService] = await Promise.all([import('../../app'), import('../events/service')]);

  return {
    app: buildApp(),
    eventsService,
  };
}

afterEach(() => {
  mock.restoreAll();
  restoreSharedTestEnv();
  resetBackendApiModuleCache();
});

describe('development auth-unavailable mode', () => {
  it('boots and serves public events as guest without JWT config', async () => {
    const { app, eventsService } = await buildEventsTestAppWithoutJwt();

    mock.method(eventsService, 'listEvents', async (userId: string | null) => {
      assert.equal(userId, null);
      return [
        {
          id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',
          title: 'Sunrise Bridge Dash',
          description: 'Public event',
          startsAt: '2026-04-01T20:00:00.000Z',
          revealAt: '2026-04-01T18:00:00.000Z',
          endsAt: '2026-04-01T22:00:00.000Z',
          startAreaRadiusKm: 1.5,
          startAreaCenter: null,
          viewerParticipationStatus: null,
          viewerJoinedAt: null,
        },
      ];
    });

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/events',
        headers: {
          Authorization: 'Bearer dev-token-without-verification',
        },
      });

      assert.equal(response.statusCode, 200);
      assert.equal(response.json().events[0]?.id, 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1');
    } finally {
      await app.close();
    }
  });

  it('serves public event detail without JWT config', async () => {
    const { app, eventsService } = await buildEventsTestAppWithoutJwt();

    mock.method(eventsService, 'getEvent', async (userId: string | null, eventId: string) => {
      assert.equal(userId, null);
      assert.equal(eventId, 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1');
      return {
        id: eventId,
        title: 'Sunrise Bridge Dash',
        description: 'Public event',
        startsAt: '2026-04-01T20:00:00.000Z',
        revealAt: '2026-04-01T18:00:00.000Z',
        endsAt: '2026-04-01T22:00:00.000Z',
        startAreaRadiusKm: 1.5,
        startAreaCenter: null,
        viewerParticipationStatus: null,
        viewerJoinedAt: null,
        participantCount: 12,
      };
    });

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/events/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',
      });

      assert.equal(response.statusCode, 200);
      assert.equal(response.json().participantCount, 12);
    } finally {
      await app.close();
    }
  });

  it('keeps protected joins unavailable without verified auth', async () => {
    const { app } = await buildEventsTestAppWithoutJwt();

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/events/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1/join',
      });

      assert.equal(response.statusCode, 503);
      assert.deepEqual(response.json(), {
        error: 'auth_unavailable',
        message: 'Authentication backend not configured in development.',
        details: {
          nodeEnv: 'development',
          missing: ['NHOST_JWKS_URL or NHOST_JWT_PUBLIC_KEY'],
        },
      });
    } finally {
      await app.close();
    }
  });
});
