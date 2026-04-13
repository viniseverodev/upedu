// Rotas de transações financeiras — S027
// GET  /transacoes?mes=&ano= — listar por período
// POST /transacoes           — registrar transação (GERENTE+)

import type { FastifyInstance } from 'fastify';
import { TransacoesController } from './transacoes.controller';
import { authenticate } from '../../../middlewares/authenticate';
import { authorize } from '../../../middlewares/authorize';
import { filialContext } from '../../../middlewares/filial-context';

export async function transacoesRoutes(app: FastifyInstance) {
  const controller = new TransacoesController();
  const base = [authenticate, filialContext];
  const gerenteOnly = [...base, authorize(['SUPER_ADMIN', 'ADMIN_MATRIZ', 'GERENTE_FILIAL'])];

  app.get('/', { preHandler: base }, controller.list.bind(controller));
  app.post('/', { preHandler: gerenteOnly }, controller.create.bind(controller));
}
