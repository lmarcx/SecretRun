import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createRateLimitPreHandler } from '../../lib/rate-limit';
import { requireBetaAccess, requireClosedBetaAccess } from '../auth/plugin';
import { getEvent, getEventRoute, joinEvent, listEvents } from './service';

const paramsSchema = z.object({
  id: z.string().uuid(),
});

export async function eventsRoutes(app: FastifyInstance) {
  app.get(
    '/events',
    {
      preHandler: [requireClosedBetaAccess],
    },
    async (request) => {
      const events = await listEvents(request.auth?.userId ?? null);

      return {
        events,
      };
    },
  );

  app.get(
    '/events/:id',
    {
      preHandler: [requireClosedBetaAccess],
    },
    async (request, reply) => {
      const params = paramsSchema.parse(request.params);
      const event = await getEvent(request.auth?.userId ?? null, params.id);

      if (!event) {
        return reply.status(404).send({
          error: 'event_not_found',
          message: 'Event not found.',
          details: null,
        });
      }

      return event;
    },
  );

  app.get(
    '/events/:id/route',
    {
      preHandler: [requireBetaAccess],
    },
    async (request) => {
      const params = paramsSchema.parse(request.params);
      return getEventRoute(request.auth!.userId, params.id);
    },
  );

  app.post(
    '/events/:id/join',
    {
      preHandler: [
        requireBetaAccess,
        createRateLimitPreHandler({
          routeId: 'events-join',
          maxRequests: 12,
          windowMs: 60_000,
        }),
      ],
    },
    async (request) => {
      const params = paramsSchema.parse(request.params);
      const status = await joinEvent(request.auth!.userId, params.id);

      return {
        status,
      };
    },
  );
}
