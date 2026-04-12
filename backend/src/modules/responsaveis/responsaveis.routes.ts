// Rotas de responsaveis — TODO: implementar em STORY-018 (Sprint 4)

import type { FastifyInstance } from 'fastify';
import { ResponsaveisController } from './responsaveis.controller';

export async function responsaveisRoutes(app: FastifyInstance) {
  const _controller = new ResponsaveisController();
  // TODO: registrar rotas em STORY-018 (Sprint 4)
}
