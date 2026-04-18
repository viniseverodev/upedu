// Rate limiting via Redis — STORY-001 (AUTH-01)
// Máx 5 tentativas de login por IP em 15 minutos
// Apenas VERIFICA o contador — o incremento ocorre somente em falhas de autenticação (auth.service.ts)

import type { FastifyRequest, FastifyReply } from 'fastify';
import { redis } from '../config/redis';
import { AppError } from '../shared/errors/AppError';

export const RATE_LIMIT_MAX_ATTEMPTS = 5;
export const RATE_LIMIT_LOGIN_KEY = (ip: string) => `rate:login:${ip}`;

export async function rateLimitLogin(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const key = RATE_LIMIT_LOGIN_KEY(request.ip);
  const raw = await redis.get(key);

  if (raw !== null && parseInt(raw, 10) >= RATE_LIMIT_MAX_ATTEMPTS) {
    const ttl = await redis.ttl(key);
    throw new AppError(
      `Muitas tentativas. Tente em ${Math.ceil(ttl / 60)} minutos.`,
      429,
      'RATE_LIMIT_EXCEEDED'
    );
  }
}
