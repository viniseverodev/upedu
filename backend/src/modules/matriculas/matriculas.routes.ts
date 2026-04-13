// Rotas de matrículas — S020
// POST /matriculas — criar matrícula com snapshot

import type { FastifyInstance } from 'fastify';
import { MatriculasController } from './matriculas.controller';
import { authenticate } from '../../middlewares/authenticate';
import { filialContext } from '../../middlewares/filial-context';

export async function matriculasRoutes(app: FastifyInstance) {
  const controller = new MatriculasController();
  const base = [authenticate, filialContext];

  app.post('/', { preHandler: base }, controller.create.bind(controller));
}
