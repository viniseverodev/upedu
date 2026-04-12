// Middleware de autenticação — ADR-004 (JWT híbrido + Redis blacklist)
// S001: verificação de token JWT + blacklist Redis
// S004: bloqueia rotas protegidas quando primeiroAcesso=true

import type { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { redis } from '../config/redis';
import { env } from '../config/env';
import { ForbiddenError, UnauthorizedError } from '../shared/errors/AppError';

export interface JwtPayload {
  sub: string;          // userId
  jti: string;          // token ID (para blacklist)
  role: string;
  orgId: string;
  primeiroAcesso: boolean;
  iat: number;
  exp: number;
}

// Payload do refresh token (JWT assinado com JWT_REFRESH_SECRET)
export interface RefreshTokenPayload {
  sub: string;  // userId
  jti: string;  // jti único hasheado no banco
  iat: number;
  exp: number;
}

declare module 'fastify' {
  interface FastifyRequest {
    user: JwtPayload;
  }
}

// Rotas de auth são públicas — não aplicar o guard de primeiro acesso
const AUTH_PATHS = ['/api/v1/auth/'];

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

  // S004 — Guard de primeiro acesso: bloquear rotas protegidas até troca de senha
  if (payload.primeiroAcesso) {
    const isAuthRoute = AUTH_PATHS.some((p) => request.url.startsWith(p));
    if (!isAuthRoute) {
      throw new ForbiddenError(
        'Troca de senha obrigatória. Acesse /primeiro-acesso para continuar.'
      );
    }
  }
}
