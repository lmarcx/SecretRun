import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
import Fastify, { type FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { isAppError } from '../../lib/errors';

process.env.NODE_ENV = 'test';
process.env.HASURA_GRAPHQL_URL ??= 'http://localhost:8080/v1/graphql';
process.env.HASURA_ADMIN_SECRET ??= 'test-secret';
process.env.NHOST_JWT_PUBLIC_KEY ??= 'test-public-key';

async function buildEventsTestApp() {
  const [{ eventsRoutes }, eventsService] = await Promise.all([import('./routes'), import('./service')]);
  const app = Fastify({ logger: false });

  app.decorateRequest('auth', null);
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: 'validation_error',
        message: 'Request validation failed.',
        details: error.flatten(),
      });
    }

    if (isAppError(error)) {
      return reply.status(error.statusCode).send({
        error: error.code,
        message: error.message,
        details: error.details ?? null,
      });
    }

    request.log.error(error);
    return reply.status(500).send({
      error: 'internal_error',
      message: 'Unexpected server error.',
    });
  });

  await app.register(eventsRoutes);

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
