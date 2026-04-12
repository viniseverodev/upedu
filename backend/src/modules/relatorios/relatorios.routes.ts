// Rotas de relatorios — TODO: implementar em STORY-025 (Sprint 6)

import type { FastifyInstance } from 'fastify';
import { RelatoriosController } from './relatorios.controller';

export async function relatoriosRoutes(_app: FastifyInstance) {
  const _controller = new RelatoriosController();
  // TODO: registrar rotas em STORY-025 (Sprint 6)
}
