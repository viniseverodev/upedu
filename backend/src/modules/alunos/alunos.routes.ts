// Rotas de alunos — TODO: implementar em STORY-012 (Sprint 3)

import type { FastifyInstance } from 'fastify';
import { AlunosController } from './alunos.controller';

export async function alunosRoutes(_app: FastifyInstance) {
  const _controller = new AlunosController();
  // TODO: registrar rotas em STORY-012 (Sprint 3)
}
