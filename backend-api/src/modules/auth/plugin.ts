import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../../lib/errors';
import { assertBetaAccess, isBetaAccessEnforced } from './beta-access';
import type { AuthContext } from './jwt';
import { assertAuthConfigured, isAuthConfigured, verifyAccessToken } from './jwt';

declare module 'fastify' {
  interface FastifyRequest {
    auth: AuthContext | null;
  }
}

const MAX_AUTHORIZATION_HEADER_LENGTH = 8_192;
const bearerJwtPattern = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

function getAuthorizationHeader(request: FastifyRequest): string {
  const authorization = request.headers.authorization;

  if (!authorization) {
    throw new AppError(401, 'missing_authorization', 'Missing Authorization header.');
  }

  if (authorization.length > MAX_AUTHORIZATION_HEADER_LENGTH) {
    throw new AppError(401, 'invalid_authorization', 'Authorization header is too large.');
  }

  if (authorization.includes(',')) {
    throw new AppError(401, 'invalid_authorization', 'Authorization header must contain a single Bearer token.');
  }

  return authorization.trim();
}

function getBearerToken(request: FastifyRequest): string {
  const authorization = getAuthorizationHeader(request);
  const match = /^Bearer\s+(.+)$/i.exec(authorization);

  if (!match) {
    throw new AppError(401, 'invalid_authorization', 'Authorization header must use Bearer token.');
  }

  const token = match[1].trim();

  if (!token || token.includes(' ') || !bearerJwtPattern.test(token)) {
    throw new AppError(401, 'invalid_authorization', 'Bearer token must be a compact JWT.');
  }

  return token;
}

export async function requireAuth(request: FastifyRequest, _reply: FastifyReply) {
  assertAuthConfigured();
  const token = getBearerToken(request);
  request.auth = await verifyAccessToken(token);
}

export async function optionalAuth(request: FastifyRequest, _reply: FastifyReply) {
  if (!isAuthConfigured()) {
    request.auth = null;
    return;
  }

  if (!request.headers.authorization) {
    request.auth = null;
    return;
  }

  const token = getBearerToken(request);
  request.auth = await verifyAccessToken(token);
}

export async function requireBetaAccess(request: FastifyRequest, reply: FastifyReply) {
  await requireAuth(request, reply);
  assertBetaAccess(request.auth!);
}

export async function requireClosedBetaAccess(request: FastifyRequest, reply: FastifyReply) {
  if (!isBetaAccessEnforced()) {
    await optionalAuth(request, reply);
    return;
  }

  await requireBetaAccess(request, reply);
}
