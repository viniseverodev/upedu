// Prisma client singleton — ADR-002
// Reutiliza instância entre hot reloads em desenvolvimento

import { PrismaClient } from '@prisma/client';
import { env } from './env';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// WARN-008 fix: usar env.NODE_ENV (Zod-validado) em vez de process.env.NODE_ENV diretamente
export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}
