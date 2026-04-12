// Validação de variáveis de ambiente com Zod
// Falha rápido na inicialização se alguma var obrigatória estiver ausente

import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3001),

  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string().url(),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Criptografia AES-256-GCM (32 bytes em hex = 64 chars)
  ENCRYPTION_KEY: z.string().length(64),

  // CORS
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
});

export const env = envSchema.parse(process.env);
