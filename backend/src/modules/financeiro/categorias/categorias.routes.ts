// Rotas de categorias financeiras — S027
// GET    /categorias     — listar por filial
// POST   /categorias     — criar categoria (GERENTE+)
// PATCH  /categorias/:id — editar categoria (GERENTE+)
// DELETE /categorias/:id — excluir/inativar categoria (GERENTE+)

import type { FastifyInstance } from 'fastify';
import { CategoriasController } from './categorias.controller';
import { authenticate } from '../../../middlewares/authenticate';
import { authorize } from '../../../middlewares/authorize';
import { filialContext } from '../../../middlewares/filial-context';

export async function categoriasRoutes(app: FastifyInstance) {
  const controller = new CategoriasController();
  const base = [authenticate, filialContext];
  const gerenteOnly = [...base, authorize(['SUPER_ADMIN', 'ADMIN_MATRIZ', 'GERENTE_FILIAL'])];

  app.get('/', { preHandler: base }, controller.list.bind(controller));
  app.post('/', { preHandler: gerenteOnly }, controller.create.bind(controller));
  app.patch('/:id', { preHandler: gerenteOnly }, controller.update.bind(controller));
  app.delete('/:id', { preHandler: gerenteOnly }, controller.delete.bind(controller));
}
