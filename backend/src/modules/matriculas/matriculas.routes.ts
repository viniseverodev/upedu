// Rotas de matrículas — S020
// POST /matriculas — criar matrícula com snapshot

import type { FastifyInstance } from 'fastify';
import { MatriculasController } from './matriculas.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { filialContext } from '../../middlewares/filial-context';

export async function matriculasRoutes(app: FastifyInstance) {
  const controller = new MatriculasController();
  const base = [authenticate, filialContext];
  // BUG-016: matrícula é ato formal de admissão — requer ao menos ATENDENTE (PROFESSOR é read-only)
  const atendenteOnly = [...base, authorize(['SUPER_ADMIN', 'ADMIN_MATRIZ', 'GERENTE_FILIAL', 'ATENDENTE'])];

  app.post('/', { preHandler: atendenteOnly }, controller.create.bind(controller));
}
