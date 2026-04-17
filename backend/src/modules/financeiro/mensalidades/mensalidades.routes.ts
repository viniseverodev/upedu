// Rotas de mensalidades — S022/S023/S024
// POST   /mensalidades           — gerar mensalidade
// PATCH  /mensalidades/:id/pagar — registrar pagamento
// PATCH  /mensalidades/:id/cancelar — cancelar (GERENTE+)

import type { FastifyInstance } from 'fastify';
import { MensalidadesController } from './mensalidades.controller';
import { authenticate } from '../../../middlewares/authenticate';
import { authorize } from '../../../middlewares/authorize';
import { filialContext } from '../../../middlewares/filial-context';

export async function mensalidadesRoutes(app: FastifyInstance) {
  const controller = new MensalidadesController();
  const base = [authenticate, filialContext];
  // BUG-016: operações financeiras requerem ao menos ATENDENTE (PROFESSOR é read-only)
  const atendenteOnly = [...base, authorize(['SUPER_ADMIN', 'ADMIN_MATRIZ', 'GERENTE_FILIAL', 'ATENDENTE'])];
  const gerenteOnly = [...base, authorize(['SUPER_ADMIN', 'ADMIN_MATRIZ', 'GERENTE_FILIAL'])];

  app.post('/', { preHandler: atendenteOnly }, controller.create.bind(controller));
  app.patch('/:id/pagar', { preHandler: atendenteOnly }, controller.pagar.bind(controller));
  app.patch('/:id/cancelar', { preHandler: gerenteOnly }, controller.cancelar.bind(controller));
}
