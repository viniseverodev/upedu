// Middleware de contexto de filial — multi-tenant row-level isolation
// Valida header x-filial-id e confirma que o usuário tem acesso à filial solicitada
// Injeta filialId no request para uso nas queries (nunca aceito do body)

import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database';
import { ForbiddenError, ValidationError } from '../shared/errors/AppError';
import { logger } from '../config/logger';
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

  // M6: validar formato UUID no boundary — evita Prisma P2005 retornar como 500 em vez de 422
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(filialId)) {
    throw new ValidationError('Header x-filial-id deve ser um UUID válido');
  }

  const userRole = request.user.role as UserRole;
  const userId = request.user.sub;

  // SUPER_ADMIN e ADMIN_MATRIZ acessam qualquer filial da organização
  if (ROLES_WITH_ALL_ACCESS.includes(userRole)) {
    const filial = await prisma.filial.findFirst({
      where: { id: filialId, organization: { users: { some: { id: userId } } } },
    });
    if (!filial) {
      // M14: IDOR — usuário tentou acessar filial que não pertence à sua organização
      logger.warn({ userId, filialId, role: userRole }, '[Security] Tentativa de acesso IDOR: filial fora da organização');
      throw new ForbiddenError('Filial não encontrada nesta organização');
    }
    request.filialId = filialId;
    return;
  }

  // Demais roles: verificar UserFilial
  const access = await prisma.userFilial.findUnique({
    where: { userId_filialId: { userId, filialId } },
  });
  if (!access) {
    // M14: IDOR — usuário tentou acessar filial à qual não tem permissão
    logger.warn({ userId, filialId, role: userRole }, '[Security] Tentativa de acesso IDOR: usuário sem vínculo com a filial');
    throw new ForbiddenError('Acesso negado a esta filial');
  }

  request.filialId = filialId;
}
