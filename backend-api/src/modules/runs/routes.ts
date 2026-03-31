import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createRateLimitPreHandler } from '../../lib/rate-limit';
import { requireBetaAccess } from '../auth/plugin';
import { finishRun, startRun } from './service';

const startRunBodySchema = z.object({
  eventId: z.string().uuid(),
  startedAt: z.string().datetime().optional(),
  lat: z.number().finite().min(-90).max(90).optional(),
  lng: z.number().finite().min(-180).max(180).optional(),
  accuracy_meters: z.number().finite().min(0).max(5000).optional(),
  timestamp: z.string().datetime().optional(),
})
  .strict()
  .superRefine((body, context) => {
    const hasLat = body.lat !== undefined;
    const hasLng = body.lng !== undefined;

    if (hasLat !== hasLng) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'lat and lng must be provided together.',
        path: hasLat ? ['lng'] : ['lat'],
      });
    }

    if ((body.accuracy_meters !== undefined || body.timestamp !== undefined) && (!hasLat || !hasLng)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'lat and lng are required when GPS telemetry is provided.',
        path: body.accuracy_meters !== undefined ? ['accuracy_meters'] : ['timestamp'],
      });
    }
  });

const finishRunBodySchema = z.object({
  activityId: z.string().uuid(),
  trackpoints: z
    .array(
      z.object({
        lat: z.number().finite().min(-90).max(90),
        lng: z.number().finite().min(-180).max(180),
        timestamp: z.string().datetime(),
        speed_kmh: z.number().finite().nullable().optional(),
      }).strict(),
    )
    .max(5000)
    .default([]),
}).strict();

export async function runsRoutes(app: FastifyInstance) {
  app.post(
    '/runs/start',
    {
      preHandler: [
        requireBetaAccess,
        createRateLimitPreHandler({
          routeId: 'runs-start',
          maxRequests: 10,
          windowMs: 60_000,
        }),
      ],
    },
    async (request) => {
      const body = startRunBodySchema.parse(request.body);
      return startRun(
        request.auth!.userId,
        body.eventId,
        body.startedAt,
        body.lat !== undefined && body.lng !== undefined
          ? {
              lat: body.lat,
              lng: body.lng,
              accuracyMeters: body.accuracy_meters,
              timestamp: body.timestamp,
            }
          : undefined,
        (diagnostic) => {
          request.log.info({ startRun: diagnostic }, 'runs/start decision');
        },
      );
    },
  );

  app.post(
    '/runs/finish',
    {
      preHandler: [
        requireBetaAccess,
        createRateLimitPreHandler({
          routeId: 'runs-finish',
          maxRequests: 8,
          windowMs: 60_000,
        }),
      ],
    },
    async (request) => {
      const body = finishRunBodySchema.parse(request.body);
      return finishRun(request.auth!.userId, body.activityId, body.trackpoints);
    },
  );
}
