// AuditService — lógica de negócio (S035)
// S035: listagem paginada e exportação CSV de audit logs

import { AuditRepository } from './audit.repository';
import type { AuditQueryInput } from './audit.schema';

export class AuditService {
  private repo = new AuditRepository();

  // S035 — Listagem paginada com filtros
  async list(orgId: string, role: string, filters: AuditQueryInput) {
    const isSuperAdmin = role === 'SUPER_ADMIN';
    const result = await this.repo.findMany({
      userId:     filters.userId,
      entityType: filters.entityType,
      dateFrom:   filters.dateFrom,
      dateTo:     filters.dateTo,
      page:       filters.page,
      orgId,
      isSuperAdmin,
    });

    return {
      data:       result.logs.map(this.toResponse),
      total:      result.total,
      page:       result.page,
      pageSize:   result.pageSize,
      totalPages: Math.ceil(result.total / result.pageSize),
    };
  }

  // S035 — Exportação CSV
  async listCsv(orgId: string, role: string, filters: Omit<AuditQueryInput, 'page' | 'format'>): Promise<string> {
    const isSuperAdmin = role === 'SUPER_ADMIN';
    const logs = await this.repo.findAllForCsv({
      userId:     filters.userId,
      entityType: filters.entityType,
      dateFrom:   filters.dateFrom,
      dateTo:     filters.dateTo,
      orgId,
      isSuperAdmin,
    });

    // C4: prevenir injeção de fórmula CSV — prefixar com tab se valor começa com =, +, -, @
    const sanitize = (val: string): string =>
      /^[=+\-@\t\r]/.test(val) ? `\t${val}` : val;

    const header = 'id,timestamp,usuario,email,acao,entidade,entidadeId,ip\n';
    const rows = logs.map((l) =>
      [
        l.id.toString(),
        l.createdAt.toISOString(),
        `"${sanitize(l.user.nome ?? '').replace(/"/g, '""')}"`,
        `"${sanitize(l.user.email ?? '').replace(/"/g, '""')}"`,
        l.action,
        l.entityType,
        l.entityId,
        l.ipAddress ?? '',
      ].join(','),
    );

    return header + rows.join('\n');
  }

  private toResponse(l: {
    id: bigint;
    userId: string;
    filialId: string | null;
    action: string;
    entityType: string;
    entityId: string;
    ipAddress: string | null;
    createdAt: Date;
    user: { nome: string; email: string };
  }) {
    return {
      id:         l.id.toString(),
      userId:     l.userId,
      userName:   l.user.nome,
      filialId:   l.filialId ?? null,
      action:     l.action,
      entityType: l.entityType,
      entityId:   l.entityId,
      ipAddress:  l.ipAddress ?? null,
      createdAt:  l.createdAt,
    };
  }
}
