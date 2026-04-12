// Rotas de users — TODO: implementar em STORY-009 (Sprint 3)

import type { FastifyInstance } from 'fastify';
import { UsersController } from './users.controller';

export async function usersRoutes(_app: FastifyInstance) {
  const _controller = new UsersController();
  // TODO: registrar rotas em STORY-009 (Sprint 3)
}
