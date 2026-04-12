// Middleware de autorização por role — ADR-002 (RBAC)
// Uso: preHandler: [authenticate, authorize(['ADMIN_MATRIZ', 'SUPER_ADMIN'])]

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { UserRole } from '@prisma/client';
import { ForbiddenError } from '../shared/errors/AppError';

export function authorize(allowedRoles: UserRole[]) {
  return async function (
    request: FastifyRequest,
    _reply: FastifyReply
  ): Promise<void> {
    const userRole = request.user.role as UserRole;
    if (!allowedRoles.includes(userRole)) {
      throw new ForbiddenError(
        `Acesso negado. Roles permitidas: ${allowedRoles.join(', ')}`
      );
    }
  };
}
