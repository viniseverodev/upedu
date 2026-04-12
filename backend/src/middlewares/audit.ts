// Middleware de auditoria automática — STORY-034 (AUDIT-01)
// Registra todas as operações de escrita (CREATE/UPDATE/DELETE) no audit_log
// Audit logs são IMUTÁVEIS — sem update/delete endpoints

import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';

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
}
