import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../config/env';

const allowedMethods = 'GET,POST,PUT,PATCH,DELETE,OPTIONS';
const defaultAllowedHeaders = ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'];
const explicitOrigins = (env.CORS_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

export function registerCors(app: FastifyInstance) {
  app.addHook('onRequest', async (request, reply) => {
    const origin = getOrigin(request);

    if (!origin) {
      if (request.method === 'OPTIONS') {
        return reply.code(204).send();
      }

      return;
    }

    if (!isAllowedOrigin(origin)) {
      if (request.method === 'OPTIONS') {
        return reply.code(403).send({
          error: 'cors_origin_denied',
          message: 'Origin not allowed.',
        });
      }

      return;
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
  reply.header('Vary', 'Origin');
  reply.header('Access-Control-Allow-Credentials', 'true');
  reply.header('Access-Control-Allow-Methods', allowedMethods);
  reply.header('Access-Control-Allow-Headers', getAllowedHeaders(request));
  reply.header('Access-Control-Max-Age', '86400');

  const requestedPrivateNetwork = request.headers['access-control-request-private-network'];
  if (requestedPrivateNetwork === 'true' && env.NODE_ENV !== 'production') {
    reply.header('Access-Control-Allow-Private-Network', 'true');
  }
}

function isAllowedOrigin(origin: string): boolean {
  if (explicitOrigins.includes(origin)) {
    return true;
  }

  if (env.NODE_ENV === 'production') {
    return false;
  }

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

  return isPrivateIpv4Host(hostname);
}

function isPrivateIpv4Host(hostname: string): boolean {
  const parts = hostname.split('.').map((value) => Number(value));
  if (parts.length !== 4 || parts.some((value) => Number.isNaN(value) || value < 0 || value > 255)) {
    return false;
  }

  if (parts[0] === 10) {
    return true;
  }

  if (parts[0] === 127) {
    return true;
  }

  if (parts[0] === 192 && parts[1] === 168) {
    return true;
  }

  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) {
    return true;
  }

  return false;
}

function getAllowedHeaders(request: FastifyRequest): string {
  const requestedHeaders = request.headers['access-control-request-headers'];
  const headerNames = new Set(defaultAllowedHeaders.map((value) => value.toLowerCase()));

  if (typeof requestedHeaders === 'string') {
    for (const value of requestedHeaders.split(',')) {
      const trimmedValue = value.trim().toLowerCase();
      if (trimmedValue) {
        headerNames.add(trimmedValue);
      }
    }
  }

  return Array.from(headerNames).join(', ');
}
