// Validação de variáveis de ambiente com Zod
// Falha rápido na inicialização se alguma var obrigatória estiver ausente

import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().default(3001),

  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string().url(),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  // Criptografia AES-256-GCM (32 bytes em hex = 64 chars hexadecimais válidos)
  ENCRYPTION_KEY: z
    .string()
    .regex(
      /^[0-9a-fA-F]{64}$/,
      "ENCRYPTION_KEY deve ter 64 caracteres hexadecimais",
    ),

  // CORS
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),

  // L3: Timezone do cron de inadimplência — configurável por ambiente
  CRON_TIMEZONE: z.string().default("America/Sao_Paulo"),
});

// H5: Object.freeze previne mutação do env em runtime
export const env = Object.freeze(envSchema.parse(process.env));
