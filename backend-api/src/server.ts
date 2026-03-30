import { buildApp } from './app';
import { env } from './config/env';

async function start() {
  const app = buildApp();
  await app.listen({
    host: env.HOST,
    port: env.PORT,
  });
}

void start();
