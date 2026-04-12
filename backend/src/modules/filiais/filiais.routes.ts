// Rotas de filiais — S006, S007, S008 (Sprint 2)
// GET  /filiais         — autenticado (filtra por role)
// GET  /filiais/ativas  — autenticado (apenas ativas — seletor S008)
// POST /filiais         — SUPER_ADMIN | ADMIN_MATRIZ
// PATCH /filiais/:id   — SUPER_ADMIN | ADMIN_MATRIZ

import type { FastifyInstance } from 'fastify';
import { FiliaisController } from './filiais.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';

export async function filiaisRoutes(app: FastifyInstance) {
  const controller = new FiliaisController();

  app.get(
    '/',
    { preHandler: [authenticate] },
    controller.list.bind(controller)
  );

  app.get(
    '/ativas',
    { preHandler: [authenticate] },
    controller.listActive.bind(controller)
  );

  app.post(
    '/',
    { preHandler: [authenticate, authorize(['SUPER_ADMIN', 'ADMIN_MATRIZ'])] },
    controller.create.bind(controller)
  );

  app.patch(
    '/:id',
    { preHandler: [authenticate, authorize(['SUPER_ADMIN', 'ADMIN_MATRIZ'])] },
    controller.update.bind(controller)
  );
}
