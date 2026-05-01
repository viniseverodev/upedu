// Rotas de oficinas
// GET    /oficinas                                        — listar
// POST   /oficinas                                        — criar
// GET    /oficinas/:id                                    — detalhes + turmas
// PATCH  /oficinas/:id                                    — editar
// DELETE /oficinas/:id                                    — desativar
// POST   /oficinas/:id/turmas                             — criar turma
// PATCH  /oficinas/:id/turmas/:turmaId                    — editar turma
// DELETE /oficinas/:id/turmas/:turmaId                    — desativar turma
// GET    /oficinas/:id/turmas/:turmaId/alunos             — listar matriculados
// POST   /oficinas/:id/turmas/:turmaId/alunos             — matricular aluno
// DELETE /oficinas/:id/turmas/:turmaId/alunos/:alunoId    — desmatricular

import type { FastifyInstance } from 'fastify';
import { OficinasController } from './oficinas.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { filialContext } from '../../middlewares/filial-context';

export async function oficinasRoutes(app: FastifyInstance) {
  const controller = new OficinasController();

  const base        = [authenticate, filialContext];
  const atendente   = [...base, authorize(['SUPER_ADMIN', 'ADMIN_MATRIZ', 'GERENTE_FILIAL', 'ATENDENTE'])];
  const gerente     = [...base, authorize(['SUPER_ADMIN', 'ADMIN_MATRIZ', 'GERENTE_FILIAL'])];

  // Oficinas
  app.get('/',           { preHandler: base },      controller.list.bind(controller));
  app.post('/',          { preHandler: atendente },  controller.create.bind(controller));
  app.get('/:id',        { preHandler: base },       controller.findById.bind(controller));
  app.patch('/:id',      { preHandler: atendente },  controller.update.bind(controller));
  app.delete('/:id',     { preHandler: gerente },    controller.delete.bind(controller));

  // Turmas
  app.post('/:id/turmas',               { preHandler: atendente }, controller.createTurma.bind(controller));
  app.patch('/:id/turmas/:turmaId',     { preHandler: atendente }, controller.updateTurma.bind(controller));
  app.delete('/:id/turmas/:turmaId',    { preHandler: gerente },   controller.deleteTurma.bind(controller));

  // Matrículas
  app.get('/:id/turmas/:turmaId/alunos',              { preHandler: base },     controller.listMatriculas.bind(controller));
  app.post('/:id/turmas/:turmaId/alunos',             { preHandler: atendente }, controller.matricular.bind(controller));
  app.delete('/:id/turmas/:turmaId/alunos/:alunoId',  { preHandler: atendente }, controller.desmatricular.bind(controller));
}
