// Middleware de contexto de filial — multi-tenant row-level isolation
// Valida header x-filial-id e confirma que o usuário tem acesso à filial solicitada
// Injeta filialId no request para uso nas queries (nunca aceito do body)

import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database';
import { ForbiddenError, ValidationError } from '../shared/errors/AppError';
import type { UserRole } from '@prisma/client';

declare module 'fastify' {
  interface FastifyRequest {
    filialId: string;
  }
}

const ROLES_WITH_ALL_ACCESS: UserRole[] = ['SUPER_ADMIN', 'ADMIN_MATRIZ'];

export async function filialContext(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const filialId = request.headers['x-filial-id'] as string;
  if (!filialId) {
    throw new ValidationError('Header x-filial-id é obrigatório');
  }

  const userRole = request.user.role as UserRole;
  const userId = request.user.sub;

  // SUPER_ADMIN e ADMIN_MATRIZ acessam qualquer filial da organização
  if (ROLES_WITH_ALL_ACCESS.includes(userRole)) {
    const filial = await prisma.filial.findFirst({
      where: { id: filialId, organization: { users: { some: { id: userId } } } },
    });
    if (!filial) throw new ForbiddenError('Filial não encontrada nesta organização');
    request.filialId = filialId;
    return;
  }

  // Demais roles: verificar UserFilial
  const access = await prisma.userFilial.findUnique({
    where: { userId_filialId: { userId, filialId } },
  });
  if (!access) {
    throw new ForbiddenError('Acesso negado a esta filial');
  }

  request.filialId = filialId;
}
