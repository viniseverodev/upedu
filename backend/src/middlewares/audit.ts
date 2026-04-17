// Middleware de auditoria automática — STORY-034 (AUDIT-01)
// Registra todas as operações de escrita (CREATE/UPDATE/DELETE) no audit_log
// Audit logs são IMUTÁVEIS — sem update/delete endpoints
// WARN-005: falha de escrita no audit log é silenciosa para não impactar a operação principal

import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { logger } from '../config/logger';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'SUSPICIOUS_TOKEN_REUSE';

export async function createAuditLog(params: {
  userId: string;
  filialId?: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  oldValues?: Prisma.InputJsonValue;
  newValues?: Prisma.InputJsonValue;
  ipAddress?: string;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        filialId: params.filialId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        oldValues: params.oldValues,
        newValues: params.newValues,
        ipAddress: params.ipAddress,
      },
    });
  } catch (err) {
    // Falha silenciosa — a operação principal já completou com sucesso.
    // Logamos para observabilidade sem propagar o erro ao caller.
    logger.error({ err, params: { action: params.action, entityType: params.entityType, entityId: params.entityId } }, '[AuditLog] Falha ao registrar audit log');
  }
}
