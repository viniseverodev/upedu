// Redis client singleton — ioredis
// Usos: JWT blacklist, rate limiting, cache de KPIs (ADR-004)

import Redis from 'ioredis';
import { env } from './env';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redis.on('error', (err) => {
  console.error('[Redis] Erro de conexão:', err);
});

// TTLs em segundos — centralizados para evitar magic numbers
export const REDIS_TTL = {
  ACCESS_TOKEN_BLACKLIST: 15 * 60,       // 15 min (= validade do access token)
  RATE_LIMIT_LOGIN: 15 * 60,             // 15 min
  KPI_CACHE: 5 * 60,                     // 5 min
  FILIAL_CACHE: 60 * 60,                 // 1 hora
} as const;
