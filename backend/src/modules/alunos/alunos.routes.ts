// Rotas de alunos — S012-S017
// GET    /alunos          — listar (authenticate + filialContext)
// POST   /alunos          — criar  (authenticate + filialContext)
// GET    /alunos/export   — CSV    (authenticate + filialContext) — antes de /:id
// GET    /alunos/:id      — perfil completo
// PATCH  /alunos/:id      — editar
// DELETE /alunos/:id      — soft delete
// PATCH  /alunos/:id/promover    — S014 (lista de espera)
// PATCH  /alunos/:id/transferir  — S015 (ADMIN_MATRIZ+)

import type { FastifyInstance } from 'fastify';
import { AlunosController } from './alunos.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { filialContext } from '../../middlewares/filial-context';

export async function alunosRoutes(app: FastifyInstance) {
  const controller = new AlunosController();

  const base = [authenticate, filialContext];
  const adminOnly = [...base, authorize(['SUPER_ADMIN', 'ADMIN_MATRIZ'])];

  app.get('/', { preHandler: base }, controller.list.bind(controller));
  app.post('/', { preHandler: base }, controller.create.bind(controller));

  // /export deve vir antes de /:id para não ser capturado como parâmetro
  app.get('/export', { preHandler: base }, controller.exportCsv.bind(controller));

  app.get('/:id', { preHandler: base }, controller.findById.bind(controller));
  app.patch('/:id', { preHandler: base }, controller.update.bind(controller));
  app.delete('/:id', { preHandler: base }, controller.softDelete.bind(controller));

  app.patch('/:id/promover', { preHandler: base }, controller.promover.bind(controller));
  app.patch('/:id/transferir', { preHandler: adminOnly }, controller.transferir.bind(controller));
}
