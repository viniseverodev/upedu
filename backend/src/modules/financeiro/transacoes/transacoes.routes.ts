// Rotas de transacoes — TODO: implementar em STORY-027 (Sprint 7)

import type { FastifyInstance } from 'fastify';
import { TransacoesController } from './transacoes.controller';

export async function transacoesRoutes(app: FastifyInstance) {
  const _controller = new TransacoesController();
  // TODO: registrar rotas em STORY-027 (Sprint 7)
}
