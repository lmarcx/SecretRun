import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from './errors';

interface RateLimitConfig {
  routeId: string;
  maxRequests: number;
  windowMs: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
let nextSweepAt = 0;

function maybeSweep(now: number) {
  if (now < nextSweepAt) {
    return;
  }

  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }

  nextSweepAt = now + 60_000;
}

function hitLimit(key: string, maxRequests: number, windowMs: number, now: number) {
  maybeSweep(now);

  const current = rateLimitStore.get(key);
  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return;
  }

  if (current.count >= maxRequests) {
    const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    throw new AppError(429, 'rate_limit_exceeded', 'Too many requests. Please retry shortly.', {
      retryAfterSeconds,
    });
  }

  current.count += 1;
  rateLimitStore.set(key, current);
}

export function createRateLimitPreHandler(config: RateLimitConfig) {
  return async function rateLimitPreHandler(request: FastifyRequest, reply: FastifyReply) {
    const now = Date.now();
    const userKey = request.auth?.userId ?? 'anonymous';
    const ipKey = request.ip || 'unknown';

    try {
      hitLimit(`rl:${config.routeId}:user:${userKey}`, config.maxRequests, config.windowMs, now);
      hitLimit(`rl:${config.routeId}:ip:${ipKey}`, config.maxRequests, config.windowMs, now);
    } catch (error) {
      if (error instanceof AppError) {
        const retryAfterSeconds =
          typeof error.details === 'object' &&
          error.details !== null &&
          'retryAfterSeconds' in error.details &&
          typeof (error.details as { retryAfterSeconds?: unknown }).retryAfterSeconds === 'number'
            ? (error.details as { retryAfterSeconds: number }).retryAfterSeconds
            : 1;

        reply.header('Retry-After', String(retryAfterSeconds));
      }

      throw error;
    }
  };
}

export function resetRateLimitStoreForTests() {
  rateLimitStore.clear();
  nextSweepAt = 0;
}
