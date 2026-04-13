// Rotas de auditoria — S035
// GET /auditoria — listagem paginada com filtros (SUPER_ADMIN + ADMIN_MATRIZ)

import type { FastifyInstance } from 'fastify';
import { AuditController } from './audit.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';

export async function auditRoutes(app: FastifyInstance) {
  const controller = new AuditController();
  const adminOnly = [authenticate, authorize(['SUPER_ADMIN', 'ADMIN_MATRIZ'])];

  app.get('/', { preHandler: adminOnly }, controller.list.bind(controller));
}
