import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createRateLimitPreHandler } from '../../lib/rate-limit';
import { requireAuth } from '../auth/plugin';
import { joinEvent } from './service';

const paramsSchema = z.object({
  id: z.string().uuid(),
});

export async function eventsRoutes(app: FastifyInstance) {
  app.post(
    '/events/:id/join',
    {
      preHandler: [
        requireAuth,
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
