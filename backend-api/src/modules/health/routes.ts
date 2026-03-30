import type { FastifyInstance } from 'fastify';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async () => {
    return {
      ok: true,
      service: 'secret-run-backend-api',
      timestamp: new Date().toISOString(),
    };
  });
}
