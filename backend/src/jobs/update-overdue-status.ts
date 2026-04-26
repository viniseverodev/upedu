// Job de atualização de inadimplência — STORY-025 (Sprint 6)
// Executa diariamente: marca mensalidades PENDENTE com dataVencimento < hoje como INADIMPLENTE
// Fase 1: node-cron simples | Release 4: migrar para BullMQ

import cron from 'node-cron';
import { prisma } from '../config/database';
import { redis } from '../config/redis';
import { logger } from '../config/logger';
import { env } from '../config/env';

// H2: lock Redis para evitar execuções simultâneas (múltiplas instâncias ou restart durante job)
const JOB_LOCK_KEY = 'lock:job:overdue-status';
const JOB_LOCK_TTL = 5 * 60; // 5 min — tempo máximo esperado para o job concluir

export function startOverdueStatusJob() {
  // L3: timezone configurável via env (default: America/Sao_Paulo)
  cron.schedule('0 0 * * *', async () => {
    // H2: tenta adquirir lock distribuído — apenas uma instância executa por vez
    const lockAcquired = await redis.set(JOB_LOCK_KEY, '1', 'EX', JOB_LOCK_TTL, 'NX').catch(() => null);
    if (!lockAcquired) {
      logger.warn('[Job] Inadimplência: outra instância já está executando, pulando...');
      return;
    }

    logger.info('[Job] Iniciando atualização de status de inadimplência...');
    try {
      const result = await prisma.mensalidade.updateMany({
        where: {
          status: 'PENDENTE',
          dataVencimento: { lte: new Date() },
        },
        data: { status: 'INADIMPLENTE' },
      });
      logger.info(`[Job] ${result.count} mensalidade(s) marcadas como INADIMPLENTE`);
    } catch (err) {
      logger.error({ err }, '[Job] Erro ao atualizar status de inadimplência');
    } finally {
      // H2: libera o lock independente do resultado
      await redis.del(JOB_LOCK_KEY).catch(() => null);
    }
  }, { timezone: env.CRON_TIMEZONE });
}
