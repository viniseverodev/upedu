// FiliaisService — lógica de negócio
// S006: cadastro de filial com validação de CNPJ único
// S007: edição com guard de desativação (alunos ativos)
// S008: listagem respeitando hierarquia de role

import { FiliaisRepository } from './filiais.repository';
import { createAuditLog } from '../../middlewares/audit';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../shared/errors/AppError';
import { DashboardService } from '../dashboard/dashboard.service';
import type { CreateFilialInput, UpdateFilialInput } from './filiais.schema';

export class FiliaisService {
  private repo = new FiliaisRepository();

  // S006 — Criar nova filial
  async create(organizationId: string, userId: string, data: CreateFilialInput, ip?: string) {
    const existing = await this.repo.findByCnpjAndOrg(data.cnpj, organizationId);
    if (existing) {
      throw new ConflictError('CNPJ já cadastrado nesta organização');
    }

    const filial = await this.repo.create(organizationId, data);

    await createAuditLog({
      userId,
      filialId: filial.id,
      action: 'CREATE',
      entityType: 'Filial',
      entityId: filial.id,
      newValues: {
        nome: filial.nome,
        cnpj: filial.cnpj,
        diaVencimento: filial.diaVencimento,
      },
      ipAddress: ip,
    });

    return filial;
  }

  // S007 — Editar filial com guard de desativação
  async update(
    id: string,
    organizationId: string,
    userId: string,
    data: UpdateFilialInput,
    ip?: string,
  ) {
    const filial = await this.repo.findById(id);
    if (!filial || filial.organizationId !== organizationId) {
      throw new NotFoundError('Filial');
    }

    // Guard: não desativar se houver alunos ativos
    if (data.ativo === false && filial.ativo === true) {
      const activeCount = await this.repo.countActiveAlunos(id);
      if (activeCount > 0) {
        throw new ValidationError(
          `Filial possui ${activeCount} aluno(s) ativo(s). Transfira-os antes de desativar.`
        );
      }
    }

    // Guard: CNPJ único se houve mudança
    if (data.cnpj && data.cnpj !== filial.cnpj) {
      const conflict = await this.repo.findByCnpjAndOrg(data.cnpj, organizationId);
      if (conflict) throw new ConflictError('CNPJ já cadastrado nesta organização');
    }

    const updated = await this.repo.update(id, data);

    await createAuditLog({
      userId,
      filialId: id,
      action: 'UPDATE',
      entityType: 'Filial',
      entityId: id,
      oldValues: { nome: filial.nome, ativo: filial.ativo },
      newValues: data as unknown as import('@prisma/client').Prisma.InputJsonValue,
      ipAddress: ip,
    });

    // H6: Invalidar cache de KPIs da filial ao atualizar dados financeiros
    // (valorMensalidade, diaVencimento, etc. afetam projeções do dashboard)
    const now = new Date();
    await DashboardService.invalidarCache(id, now.getMonth() + 1, now.getFullYear());

    return updated;
  }

  // S008 — Listar filiais (todas — para página de admin)
  async list(userId: string, organizationId: string, role: string) {
    if (role === 'SUPER_ADMIN' || role === 'ADMIN_MATRIZ') {
      return this.repo.findAllByOrg(organizationId);
    }
    return this.repo.findAllByUserId(userId);
  }

  // S008 — Listar filiais ativas para o seletor de filial
  async listActive(userId: string, organizationId: string, role: string) {
    if (role === 'SUPER_ADMIN' || role === 'ADMIN_MATRIZ') {
      return this.repo.findActiveByOrg(organizationId);
    }
    return this.repo.findActiveByUserId(userId);
  }
}
