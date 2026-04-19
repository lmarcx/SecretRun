import type { FastifyInstance } from 'fastify';
import { createRateLimitPreHandler } from '../../lib/rate-limit';
import { applyAuthResponseSecurityHeaders, getMeController } from './controller';
import { requireAuth } from './plugin';

export async function authRoutes(app: FastifyInstance) {
  app.get('/me', {
    onRequest: [applyAuthResponseSecurityHeaders],
    preHandler: [
      requireAuth,
      createRateLimitPreHandler({
        routeId: 'auth-me',
        maxRequests: 30,
        windowMs: 60_000,
      }),
    ],
    handler: getMeController,
  });
}
