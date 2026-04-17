// Job de atualização de inadimplência — STORY-025 (Sprint 6)
// Executa diariamente: marca mensalidades PENDENTE com dataVencimento < hoje como INADIMPLENTE
// Fase 1: node-cron simples | Release 4: migrar para BullMQ

import cron from 'node-cron';
import { prisma } from '../config/database';
import { logger } from '../config/logger';

export function startOverdueStatusJob() {
  // C3: timezone explícito — meia-noite horário de Brasília (UTC-3) para evitar divergência
  cron.schedule('0 0 * * *', async () => {
    logger.info('[Job] Iniciando atualização de status de inadimplência...');
    try {
      const result = await prisma.mensalidade.updateMany({
        where: {
          status: 'PENDENTE',
          dataVencimento: { lt: new Date() },
        },
        data: { status: 'INADIMPLENTE' },
      });
      logger.info(`[Job] ${result.count} mensalidade(s) marcadas como INADIMPLENTE`);
    } catch (err) {
      logger.error({ err }, '[Job] Erro ao atualizar status de inadimplência');
    }
  }, { timezone: 'America/Sao_Paulo' });
}
