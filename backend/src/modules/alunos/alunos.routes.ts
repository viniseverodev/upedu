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
  // BUG-016: operações de escrita/deleção requerem ao menos ATENDENTE (PROFESSOR é read-only)
  const atendenteOnly = [...base, authorize(['SUPER_ADMIN', 'ADMIN_MATRIZ', 'GERENTE_FILIAL', 'ATENDENTE'])];
  // BUG-016: promoção e deleção requerem GERENTE_FILIAL+
  const gerenteOnly = [...base, authorize(['SUPER_ADMIN', 'ADMIN_MATRIZ', 'GERENTE_FILIAL'])];

  app.get('/', { preHandler: base }, controller.list.bind(controller));
  app.post('/', { preHandler: atendenteOnly }, controller.create.bind(controller));

  // /export deve vir antes de /:id para não ser capturado como parâmetro
  app.get('/export', { preHandler: base }, controller.exportCsv.bind(controller));

  app.get('/:id', { preHandler: base }, controller.findById.bind(controller));
  app.patch('/:id', { preHandler: atendenteOnly }, controller.update.bind(controller));
  app.delete('/:id', { preHandler: gerenteOnly }, controller.softDelete.bind(controller));

  app.patch('/:id/promover', { preHandler: gerenteOnly }, controller.promover.bind(controller));
  app.patch('/:id/transferir', { preHandler: adminOnly }, controller.transferir.bind(controller));

  // S019 — Vincular/desvincular responsáveis (BUG-016: escrita requer ATENDENTE+, desvincular requer GERENTE+)
  app.post('/:id/responsaveis', { preHandler: atendenteOnly }, respController.vincular.bind(respController));
  app.delete('/:alunoId/responsaveis/:responsavelId', { preHandler: gerenteOnly }, respController.desvincular.bind(respController));

  // S021 — Histórico de matrículas
  app.get('/:id/matriculas', { preHandler: base }, matriculasController.listByAluno.bind(matriculasController));
}
