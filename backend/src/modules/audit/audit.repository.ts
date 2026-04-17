// AuditRepository — queries Prisma (S035)
// Listagem paginada de audit logs com filtros opcionais

import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';

const PAGE_SIZE = 50;

export interface AuditFilters {
  userId?:     string;
  entityType?: string;
  dateFrom?:   string;
  dateTo?:     string;
  page:        number;
  orgId:       string;
  isSuperAdmin: boolean;
}

export class AuditRepository {
  async findMany(filters: AuditFilters) {
    const where = this.buildWhere(filters);
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { nome: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.auditLog.count({ where }),
    ]);
    return { logs, total, page: filters.page, pageSize: PAGE_SIZE };
  }

  async findAllForCsv(filters: Omit<AuditFilters, 'page'>) {
    // BUG-019: limite máximo de 10 000 linhas para evitar exaustão de memória no export CSV
    return prisma.auditLog.findMany({
      where: this.buildWhere({ ...filters, page: 1 }),
      include: { user: { select: { nome: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10_000,
    });
  }

  private buildWhere(filters: AuditFilters): Prisma.AuditLogWhereInput {
    const where: Prisma.AuditLogWhereInput = {};

    // Escopo por organização (exceto SUPER_ADMIN que vê tudo)
    if (!filters.isSuperAdmin) {
      where.user = { organizationId: filters.orgId };
    }

    if (filters.userId)     where.userId     = filters.userId;
    if (filters.entityType) where.entityType = filters.entityType;

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        (where.createdAt as Prisma.DateTimeFilter).gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        const to = new Date(filters.dateTo);
        to.setHours(23, 59, 59, 999);
        (where.createdAt as Prisma.DateTimeFilter).lte = to;
      }
    }

    return where;
  }
}
