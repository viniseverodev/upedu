// Rotas de alunos — S012-S017 + S019 + S021
// GET    /alunos                                    — listar
// POST   /alunos                                    — criar
// GET    /alunos/export                             — CSV (antes de /:id)
// GET    /alunos/:id                                — perfil completo
// PATCH  /alunos/:id                                — editar
// DELETE /alunos/:id                                — soft delete
// PATCH  /alunos/:id/promover                       — S014 (lista de espera)
// PATCH  /alunos/:id/transferir                     — S015 (ADMIN_MATRIZ+)
// POST   /alunos/:id/responsaveis                   — S019 vincular
// DELETE /alunos/:alunoId/responsaveis/:responsavelId — S019 desvincular
// GET    /alunos/:id/matriculas                     — S021 histórico

import type { FastifyInstance } from 'fastify';
import { AlunosController } from './alunos.controller';
import { ResponsaveisController } from '../responsaveis/responsaveis.controller';
import { MatriculasController } from '../matriculas/matriculas.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { filialContext } from '../../middlewares/filial-context';

export async function alunosRoutes(app: FastifyInstance) {
  const controller = new AlunosController();
  const respController = new ResponsaveisController();
  const matriculasController = new MatriculasController();

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

  // S019 — Vincular/desvincular responsáveis
  app.post('/:id/responsaveis', { preHandler: base }, respController.vincular.bind(respController));
  app.delete('/:alunoId/responsaveis/:responsavelId', { preHandler: base }, respController.desvincular.bind(respController));

  // S021 — Histórico de matrículas
  app.get('/:id/matriculas', { preHandler: base }, matriculasController.listByAluno.bind(matriculasController));
}
