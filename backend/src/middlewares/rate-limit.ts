// Rate limiting via Redis — STORY-001 (AUTH-01)
// Máx 5 tentativas de login por IP em 15 minutos

import type { FastifyRequest, FastifyReply } from 'fastify';
import { redis, REDIS_TTL } from '../config/redis';
import { AppError } from '../shared/errors/AppError';

const MAX_ATTEMPTS = 5;

export async function rateLimitLogin(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const ip = request.ip;
  const key = `rate:login:${ip}`;

  // WARN-006 fix: SET NX EX é atômico — evita race condition entre INCR e EXPIRE.
  // Se a chave já existe, SET NX não faz nada; se não existe, cria com TTL em uma única operação.
  await redis.set(key, '0', 'EX', REDIS_TTL.RATE_LIMIT_LOGIN, 'NX');
  const attempts = await redis.incr(key);

  if (attempts > MAX_ATTEMPTS) {
    const ttl = await redis.ttl(key);
    throw new AppError(
      `Muitas tentativas. Tente em ${Math.ceil(ttl / 60)} minutos.`,
      429,
      'RATE_LIMIT_EXCEEDED'
    );
  }
}
