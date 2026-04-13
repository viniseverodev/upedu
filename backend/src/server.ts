// Entry point do servidor
// Inicia Fastify, PostgreSQL (Prisma) e Redis

import { buildApp } from './app';
import { env } from './config/env';
import { prisma } from './config/database';
import { redis } from './config/redis';
import { startOverdueStatusJob } from './jobs/update-overdue-status';

async function main() {
  const app = await buildApp();

  try {
    await prisma.$connect();
    app.log.info('PostgreSQL conectado');

    await redis.ping();
    app.log.info('Redis conectado');

    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    app.log.info(`Servidor rodando na porta ${env.PORT}`);

    // S025 — Job diário de inadimplência
    startOverdueStatusJob();
    app.log.info('Job de inadimplência registrado (diário, 00:00)');
  } catch (err) {
    app.log.error(err);
    await prisma.$disconnect();
    redis.disconnect();
    process.exit(1);
  }
}

main();
