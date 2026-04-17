// Rotas de responsaveis — S018
// GET    /responsaveis                   — listar responsáveis da filial (filialContext)
// POST   /responsaveis                   — criar responsável (cpf/rg encriptados)
// GET    /responsaveis/:id               — perfil com cpf/rg mascarados
// GET    /responsaveis/:id/revelar-cpf   — cpf completo + audit (ADMIN+)
// PATCH  /responsaveis/:id               — atualizar

import type { FastifyInstance } from 'fastify';
import { ResponsaveisController } from './responsaveis.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { filialContext } from '../../middlewares/filial-context';

export async function responsaveisRoutes(app: FastifyInstance) {
  const controller = new ResponsaveisController();

  const base = [authenticate];
  const baseFilial = [authenticate, filialContext];
  // BUG-016: escrita requer ao menos ATENDENTE (PROFESSOR é read-only)
  const atendenteOnly = [...base, authorize(['SUPER_ADMIN', 'ADMIN_MATRIZ', 'GERENTE_FILIAL', 'ATENDENTE'])];
  const adminOnly = [...base, authorize(['SUPER_ADMIN', 'ADMIN_MATRIZ', 'GERENTE_FILIAL'])];

  // Listagem scoped por filial — requer x-filial-id
  app.get('/', { preHandler: baseFilial }, controller.list.bind(controller));

  app.post('/', { preHandler: atendenteOnly }, controller.create.bind(controller));

  // /revelar-cpf deve vir antes de /:id para não ser capturado como parâmetro
  app.get('/:id/revelar-cpf', { preHandler: adminOnly }, controller.revelarCpf.bind(controller));
  app.get('/:id', { preHandler: base }, controller.findById.bind(controller));
  app.patch('/:id', { preHandler: atendenteOnly }, controller.update.bind(controller));
}
