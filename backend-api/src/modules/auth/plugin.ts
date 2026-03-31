import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../../lib/errors';
import type { AuthContext } from './jwt';
import { verifyAccessToken } from './jwt';

declare module 'fastify' {
  interface FastifyRequest {
    auth: AuthContext | null;
  }
}

function getBearerToken(request: FastifyRequest): string {
  const authorization = request.headers.authorization;
  if (!authorization) {
    throw new AppError(401, 'missing_authorization', 'Missing Authorization header.');
  }

  const [scheme, token] = authorization.split(' ');
  if (!scheme || !token || scheme.toLowerCase() !== 'bearer') {
    throw new AppError(401, 'invalid_authorization', 'Authorization header must use Bearer token.');
  }

  return token;
}

export async function requireAuth(request: FastifyRequest, _reply: FastifyReply) {
  const token = getBearerToken(request);
  request.auth = await verifyAccessToken(token);
}

export async function optionalAuth(request: FastifyRequest, _reply: FastifyReply) {
  if (!request.headers.authorization) {
    request.auth = null;
    return;
  }

  const token = getBearerToken(request);
  request.auth = await verifyAccessToken(token);
}
