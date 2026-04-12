// Rotas de dashboard — TODO: implementar em STORY-030 (Sprint 6)

import type { FastifyInstance } from 'fastify';
import { DashboardController } from './dashboard.controller';

export async function dashboardRoutes(app: FastifyInstance) {
  const _controller = new DashboardController();
  // TODO: registrar rotas em STORY-030 (Sprint 6)
}
