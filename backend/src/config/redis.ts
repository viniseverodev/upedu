// Redis client singleton — ioredis
// Usos: JWT blacklist, rate limiting, cache de KPIs (ADR-004)

import Redis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

// WARN-007 fix: usar pino logger em vez de console.error para consistência de observabilidade
redis.on('error', (err) => {
  logger.error({ err }, '[Redis] Erro de conexão');
});

// TTLs em segundos — centralizados para evitar magic numbers
export const REDIS_TTL = {
  ACCESS_TOKEN_BLACKLIST: 15 * 60,       // 15 min (= validade do access token)
  RATE_LIMIT_LOGIN: 15 * 60,             // 15 min
  KPI_CACHE: 5 * 60,                     // 5 min
  FILIAL_CACHE: 60 * 60,                 // 1 hora
} as const;
