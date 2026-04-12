// Rotas de matriculas — TODO: implementar em STORY-020 (Sprint 4)

import type { FastifyInstance } from 'fastify';
import { MatriculasController } from './matriculas.controller';

export async function matriculasRoutes(app: FastifyInstance) {
  const _controller = new MatriculasController();
  // TODO: registrar rotas em STORY-020 (Sprint 4)
}
