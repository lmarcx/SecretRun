import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../config/env';

const allowedMethods = 'GET,POST,PUT,PATCH,DELETE,OPTIONS';
const defaultAllowedHeaders = ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'];

// Parsed once at startup. Add origins via CORS_ALLOWED_ORIGINS env var (comma-separated).
// These are always allowed regardless of NODE_ENV.
const explicitOrigins = (env.CORS_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

export function registerCors(app: FastifyInstance) {
  app.addHook('onRequest', async (request, reply) => {
    const origin = getOrigin(request);

    // No Origin header: non-browser client (curl, server-to-server).
    // Respond to OPTIONS so it doesn't hang; skip CORS headers.
    if (!origin) {
      if (request.method === 'OPTIONS') {
        return reply.code(204).send();
      }
      return;
    }

    if (!isAllowedOrigin(origin)) {
      // Return 403 with a JSON body so the error is visible in server logs.
      // The browser will report status 0 ("null") because it can't read a
      // response that lacks Access-Control-Allow-Origin — this is expected CORS behaviour.
      return reply.code(403).send({
        error: 'cors_origin_denied',
        message: `Origin not allowed: ${origin}`,
      });
    }

    applyCorsHeaders(request, reply, origin);

    if (request.method === 'OPTIONS') {
      return reply.code(204).send();
    }
  });
}

function getOrigin(request: FastifyRequest): string | null {
  const header = request.headers.origin;
  return typeof header === 'string' && header.trim() ? header.trim() : null;
}

function applyCorsHeaders(request: FastifyRequest, reply: FastifyReply, origin: string) {
  reply.header('Access-Control-Allow-Origin', origin);
  // Vary: Origin tells CDNs/proxies that the response differs per origin.
  reply.header('Vary', 'Origin');
  reply.header('Access-Control-Allow-Credentials', 'true');
  reply.header('Access-Control-Allow-Methods', allowedMethods);
  reply.header('Access-Control-Allow-Headers', getAllowedHeaders(request));
  // 24 h cache for preflight — avoids a round-trip on every request.
  reply.header('Access-Control-Max-Age', '86400');

  // Chrome Private Network Access (PNA): required when a non-private origin
  // (localhost, public IP) calls a private-network address (192.168.x.x, 10.x.x.x).
  // We send this header whenever the origin is already allowed — there is no
  // additional security risk since the origin passed isAllowedOrigin() above.
  // Without this header Chrome aborts the preflight and reports "null status code".
  if (request.headers['access-control-request-private-network'] === 'true') {
    reply.header('Access-Control-Allow-Private-Network', 'true');
  }
}

function isAllowedOrigin(origin: string): boolean {
  // Explicit list always wins, even in production.
  if (explicitOrigins.includes(origin)) {
    return true;
  }

  // In production only explicit origins are trusted.
  if (env.NODE_ENV === 'production') {
    return false;
  }

  // Development / test: accept localhost and private-network IPs automatically
  // so developers don't need to enumerate every port they use.
  return isLocalDevelopmentOrigin(origin);
}

function isLocalDevelopmentOrigin(origin: string): boolean {
  let url: URL;

  try {
    url = new URL(origin);
  } catch {
    return false;
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    return false;
  }

  const hostname = url.hostname.toLowerCase();

  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    return true;
  }

  return isPrivateIpv4(hostname);
}

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split('.').map(Number);

  if (parts.length !== 4 || parts.some((v) => Number.isNaN(v) || v < 0 || v > 255)) {
    return false;
  }

  const [a, b] = parts;

  // RFC 1918 private ranges + loopback
  return (
    a === 10 ||
    a === 127 ||
    (a === 192 && b === 168) ||
    (a === 172 && b >= 16 && b <= 31)
  );
}

function getAllowedHeaders(request: FastifyRequest): string {
  const requested = request.headers['access-control-request-headers'];
  const names = new Set(defaultAllowedHeaders.map((h) => h.toLowerCase()));

  if (typeof requested === 'string') {
    for (const h of requested.split(',')) {
      const trimmed = h.trim().toLowerCase();
      if (trimmed) names.add(trimmed);
    }
  }

  return Array.from(names).join(', ');
}
