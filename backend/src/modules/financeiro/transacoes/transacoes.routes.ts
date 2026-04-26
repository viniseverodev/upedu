// Rotas de transações financeiras — S027
// GET    /transacoes               — listar por período (mes/ano ou dataInicio/dataFim)
// POST   /transacoes               — registrar transação (GERENTE+)
// PATCH  /transacoes/bulk          — editar em lote (GERENTE+)
// DELETE /transacoes/bulk          — excluir em lote (GERENTE+)
// PATCH  /transacoes/:id           — editar transação (GERENTE+)
// DELETE /transacoes/:id           — excluir transação (GERENTE+)

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

  // Bulk antes de /:id para evitar conflito de rota
  app.patch('/bulk', { preHandler: gerenteOnly }, controller.updateBulk.bind(controller));
  app.delete('/bulk', { preHandler: gerenteOnly }, controller.removeBulk.bind(controller));

  app.patch('/:id', { preHandler: gerenteOnly }, controller.update.bind(controller));
  app.delete('/:id', { preHandler: gerenteOnly }, controller.remove.bind(controller));
}
