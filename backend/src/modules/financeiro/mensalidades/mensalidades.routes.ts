// Rotas de mensalidades — S022/S023/S024
// GET    /mensalidades?mes=&ano= — listar mensalidades do mês
// POST   /mensalidades           — gerar mensalidade
// PATCH  /mensalidades/:id/pagar    — registrar pagamento
// PATCH  /mensalidades/:id/estornar — estornar pagamento (GERENTE+)
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

  app.get('/', { preHandler: base }, controller.list.bind(controller));
  app.post('/', { preHandler: atendenteOnly }, controller.create.bind(controller));
  app.patch('/:id/pagar', { preHandler: atendenteOnly }, controller.pagar.bind(controller));
  app.patch('/:id/estornar', { preHandler: gerenteOnly }, controller.estornar.bind(controller));
  app.patch('/:id/cancelar', { preHandler: gerenteOnly }, controller.cancelar.bind(controller));
  // Ações em lote
  app.post('/bulk/pagar', { preHandler: atendenteOnly }, controller.bulkPagar.bind(controller));
  app.post('/bulk/cancelar', { preHandler: gerenteOnly }, controller.bulkCancelar.bind(controller));
  app.post('/bulk/estornar', { preHandler: gerenteOnly }, controller.bulkEstornar.bind(controller));
}
