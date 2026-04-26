// Rate limiting via Redis — STORY-001 (AUTH-01) + H3 (por usuário autenticado)
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

// H3: Rate limiting por usuário autenticado — 300 req/min para qualquer endpoint
// Protege contra enumeração de dados e scraping
export const RATE_LIMIT_USER_MAX = 300;
export const RATE_LIMIT_USER_WINDOW = 60; // segundos
export const RATE_LIMIT_USER_KEY = (userId: string) => `rate:user:${userId}`;

export async function rateLimitUser(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  // Só aplica após autenticação (request.user disponível)
  if (!request.user?.sub) return;

  const key = RATE_LIMIT_USER_KEY(request.user.sub);
  const pipeline = redis.pipeline();
  pipeline.incr(key);
  pipeline.expire(key, RATE_LIMIT_USER_WINDOW, 'NX'); // seta TTL apenas se não existia
  const results = await pipeline.exec();

  const count = results?.[0]?.[1] as number | null;
  if (count !== null && count > RATE_LIMIT_USER_MAX) {
    throw new AppError(
      'Limite de requisições atingido. Aguarde um minuto.',
      429,
      'RATE_LIMIT_EXCEEDED'
    );
  }
}
