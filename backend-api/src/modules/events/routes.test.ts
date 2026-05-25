import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';

process.env.NODE_ENV = 'test';
process.env.HASURA_GRAPHQL_URL ??= 'http://localhost:8080/v1/graphql';
process.env.HASURA_ADMIN_SECRET ??= 'test-secret';
process.env.NHOST_JWT_PUBLIC_KEY ??= 'test-public-key';

async function buildEventsTestApp() {
  const [{ buildApp }, eventsService] = await Promise.all([import('../../app'), import('./service')]);
  const app = buildApp();

  return {
    app,
    eventsService,
  };
}

afterEach(() => {
  mock.restoreAll();
});

describe('events routes guest access', () => {
  it('lets guests read the public events list', async () => {
    const { app, eventsService } = await buildEventsTestApp();

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
          participantCount: 22,
          maxParticipants: 40,
          viewerParticipationStatus: null,
          viewerJoinedAt: null,
        },
      ];
    });

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/events',
      });

      assert.equal(response.statusCode, 200);
      assert.deepEqual(response.json(), {
        events: [
          {
            id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',
            title: 'Sunrise Bridge Dash',
            description: 'Public event',
            startsAt: '2026-04-01T20:00:00.000Z',
            revealAt: '2026-04-01T18:00:00.000Z',
            endsAt: '2026-04-01T22:00:00.000Z',
            startAreaRadiusKm: 1.5,
            startAreaCenter: null,
            participantCount: 22,
            maxParticipants: 40,
            viewerParticipationStatus: null,
            viewerJoinedAt: null,
          },
        ],
      });
    } finally {
      await app.close();
    }
  });

  it('lets guests read a public event detail', async () => {
    const { app, eventsService } = await buildEventsTestApp();

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
      assert.equal(response.json().startAreaCenter, null);
    } finally {
      await app.close();
    }
  });

  it('handles allowed dev preflight requests for public events', async () => {
    const { app } = await buildEventsTestApp();

    try {
      const response = await app.inject({
        method: 'OPTIONS',
        url: '/events',
        headers: {
          Origin: 'http://localhost:8081',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'content-type,authorization,accept,x-requested-with',
          'Access-Control-Request-Private-Network': 'true',
        },
      });

      assert.equal(response.statusCode, 204);
      assert.equal(response.headers['access-control-allow-origin'], 'http://localhost:8081');
      assert.match(String(response.headers['access-control-allow-methods'] ?? ''), /GET/);
      assert.match(String(response.headers['access-control-allow-headers'] ?? ''), /authorization/i);
      assert.equal(response.headers['access-control-allow-private-network'], 'true');
    } finally {
      await app.close();
    }
  });

  it('blocks guest joins at the backend', async () => {
    const { app } = await buildEventsTestApp();

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/events/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1/join',
      });

      assert.equal(response.statusCode, 401);
      assert.equal(response.json().error, 'missing_authorization');
    } finally {
      await app.close();
    }
  });

  it('blocks guest access to protected route data', async () => {
    const { app } = await buildEventsTestApp();

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/events/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1/route',
      });

      assert.equal(response.statusCode, 401);
      assert.equal(response.json().error, 'missing_authorization');
    } finally {
      await app.close();
    }
  });
});
