// Rotas de filiais — TODO: implementar em STORY-006 (Sprint 2)

import type { FastifyInstance } from 'fastify';
import { FiliaisController } from './filiais.controller';

export async function filiaisRoutes(app: FastifyInstance) {
  const _controller = new FiliaisController();
  // TODO: registrar rotas em STORY-006 (Sprint 2)
}
