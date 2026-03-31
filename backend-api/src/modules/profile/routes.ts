import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireBetaAccess } from '../auth/plugin';
import { createCurrentProfile, getCurrentProfile, getCurrentProfileStats } from './service';

const createProfileBodySchema = z
  .object({
    username: z.string().trim().regex(/^[a-z0-9_]{3,20}$/),
    displayName: z.string().trim().min(2).max(60),
    avatarUrl: z.string().url().nullable().optional(),
  })
  .strict();

export async function profileRoutes(app: FastifyInstance) {
  app.get(
    '/profile',
    {
      preHandler: [requireBetaAccess],
    },
    async (request) => {
      const profile = await getCurrentProfile(request.auth!.userId);

      return {
        profile,
      };
    },
  );

  app.get(
    '/profile/stats',
    {
      preHandler: [requireBetaAccess],
    },
    async (request) => getCurrentProfileStats(request.auth!.userId),
  );

  app.post(
    '/profile',
    {
      preHandler: [requireBetaAccess],
    },
    async (request) => {
      const body = createProfileBodySchema.parse(request.body);
      const profile = await createCurrentProfile(request.auth!.userId, body);

      return {
        profile,
      };
    },
  );
}
