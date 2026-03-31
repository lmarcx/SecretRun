import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireBetaAccess } from '../auth/plugin';
import { getFeed } from './service';

const feedQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();

export async function feedRoutes(app: FastifyInstance) {
  app.get(
    '/feed',
    {
      preHandler: [requireBetaAccess],
    },
    async (request) => {
      const query = feedQuerySchema.parse(request.query);
      return getFeed(request.auth!.userId, query.limit ?? 20);
    },
  );
}
