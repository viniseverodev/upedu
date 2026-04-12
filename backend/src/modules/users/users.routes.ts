// Rotas de usuários — S009, S010 (Sprint 3)
// GET  /users       — autenticado (ADMIN_MATRIZ+)
// POST /users       — SUPER_ADMIN | ADMIN_MATRIZ
// PATCH /users/:id  — SUPER_ADMIN | ADMIN_MATRIZ

import type { FastifyInstance } from 'fastify';
import { UsersController } from './users.controller';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';

export async function usersRoutes(app: FastifyInstance) {
  const controller = new UsersController();

  app.get(
    '/',
    { preHandler: [authenticate, authorize(['SUPER_ADMIN', 'ADMIN_MATRIZ'])] },
    controller.list.bind(controller)
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
