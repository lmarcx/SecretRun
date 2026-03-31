import Fastify from 'fastify';
import { ZodError } from 'zod';
import { env } from './config/env';
import { registerCors } from './lib/cors';
import { isAppError } from './lib/errors';
import { authRoutes } from './modules/auth/routes';
import { eventsRoutes } from './modules/events/routes';
import { healthRoutes } from './modules/health/routes';
import { leaderboardRoutes } from './modules/leaderboard/routes';
import { notificationsRoutes } from './modules/notifications/routes';
import { feedRoutes } from './modules/feed/routes';
import { profileRoutes } from './modules/profile/routes';
import { runsRoutes } from './modules/runs/routes';

export function buildApp() {
  const app = Fastify({
    logger: env.NODE_ENV !== 'test',
  });

  app.decorateRequest('auth', null);
  registerCors(app);

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

  app.register(healthRoutes);
  app.register(authRoutes);
  app.register(eventsRoutes);
  app.register(runsRoutes);
  app.register(profileRoutes);
  app.register(feedRoutes);
  app.register(leaderboardRoutes);
  app.register(notificationsRoutes);

  return app;
}
