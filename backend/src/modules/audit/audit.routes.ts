// Rotas de audit — TODO: implementar em STORY-034 (Sprint 3)

import type { FastifyInstance } from 'fastify';
import { AuditController } from './audit.controller';

export async function auditRoutes(app: FastifyInstance) {
  const _controller = new AuditController();
  // TODO: registrar rotas em STORY-034 (Sprint 3)
}
