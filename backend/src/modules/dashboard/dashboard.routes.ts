// Rotas de dashboard — S030
// GET /dashboard/kpis?mes=&ano= — KPIs da filial (cache Redis 5min)

import type { FastifyInstance } from 'fastify';
import { DashboardController } from './dashboard.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { filialContext } from '../../middlewares/filial-context';

export async function dashboardRoutes(app: FastifyInstance) {
  const controller = new DashboardController();
  const gerenteOnly = [
    authenticate,
    filialContext,
    authorize(['SUPER_ADMIN', 'ADMIN_MATRIZ', 'GERENTE_FILIAL']),
  ];
  // S031 — comparativo não usa filialContext (escopo de organização)
  const adminOnly = [authenticate, authorize(['SUPER_ADMIN', 'ADMIN_MATRIZ'])];

  app.get('/kpis', { preHandler: gerenteOnly }, controller.kpis.bind(controller));
  app.get('/kpis/comparativo', { preHandler: adminOnly }, controller.comparativo.bind(controller));
}
