// Middleware de autenticação — ADR-004 (JWT híbrido + Redis blacklist)
// Ordem no stack: 1º na cadeia (rate-limit → authenticate → filial-context → authorize)

import type { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { redis } from '../config/redis';
import { env } from '../config/env';
import { UnauthorizedError } from '../shared/errors/AppError';

export interface JwtPayload {
  sub: string;       // userId
  jti: string;       // token ID (para blacklist)
  role: string;
  orgId: string;
  iat: number;
  exp: number;
}

declare module 'fastify' {
  interface FastifyRequest {
    user: JwtPayload;
  }
}

export async function authenticate(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Token não fornecido');
  }

  const token = authHeader.split(' ')[1];

  let payload: JwtPayload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  } catch {
    throw new UnauthorizedError('Token inválido ou expirado');
  }

  // Verificar blacklist no Redis (logout ou desativação de usuário)
  const blacklisted = await redis.get(`blacklist:jwt:${payload.jti}`);
  if (blacklisted) {
    throw new UnauthorizedError('Token revogado');
  }

  request.user = payload;
}
