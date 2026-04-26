// TransacoesService — lógica de negócio (S027)

import { TransacoesRepository } from './transacoes.repository';
import { createAuditLog } from '../../../middlewares/audit';
import { NotFoundError, ValidationError } from '../../../shared/errors/AppError';
import { prisma } from '../../../config/database';
import type { CreateTransacaoInput, UpdateTransacaoInput, BulkUpdateInput } from './transacoes.schema';
import type { TransacaoTipo } from '@prisma/client';

export class TransacoesService {
  private repo = new TransacoesRepository();

  async create(filialId: string, userId: string, data: CreateTransacaoInput, ip?: string) {
    const categoria = await prisma.categoriaFinanceira.findFirst({
      where: { id: data.categoriaId, filialId, removida: false },
    });
    if (!categoria) throw new NotFoundError('Categoria');

    const transacao = await this.repo.create({
      filialId,
      categoriaId: data.categoriaId,
      tipo: data.tipo,
      descricao: data.descricao,
      valor: data.valor,
      // M2: sufixo -03:00 garante interpretação BRT — evita shift de 1 dia em servidor UTC
      dataTransacao: new Date(data.dataTransacao + 'T00:00:00-03:00'),
    });

    await createAuditLog({
      userId,
      filialId,
      action: 'CREATE',
      entityType: 'Transacao',
      entityId: transacao.id,
      newValues: { tipo: data.tipo, valor: data.valor, categoriaId: data.categoriaId } as unknown as import('@prisma/client').Prisma.InputJsonValue,
      ipAddress: ip,
    });

    return { ...transacao, valor: Number(transacao.valor) };
  }

  async update(filialId: string, userId: string, id: string, data: UpdateTransacaoInput, ip?: string) {
    const existing = await this.repo.findById(id, filialId);
    if (!existing) throw new NotFoundError('Transação');

    if (data.categoriaId) {
      const cat = await prisma.categoriaFinanceira.findFirst({ where: { id: data.categoriaId, filialId, removida: false } });
      if (!cat) throw new NotFoundError('Categoria');
    }

    const updateData: Parameters<typeof this.repo.update>[1] = {};
    if (data.categoriaId) updateData.categoriaId = data.categoriaId;
    if (data.tipo) updateData.tipo = data.tipo as TransacaoTipo;
    if (data.descricao) updateData.descricao = data.descricao;
    if (data.valor !== undefined) updateData.valor = data.valor;
    // M2: sufixo -03:00 garante interpretação BRT — evita shift de 1 dia em servidor UTC
    if (data.dataTransacao) updateData.dataTransacao = new Date(data.dataTransacao + 'T00:00:00-03:00');

    const transacao = await this.repo.update(id, updateData);

    await createAuditLog({
      userId,
      filialId,
      action: 'UPDATE',
      entityType: 'Transacao',
      entityId: id,
      newValues: data as unknown as import('@prisma/client').Prisma.InputJsonValue,
      ipAddress: ip,
    });

    return { ...transacao, valor: Number(transacao.valor) };
  }

  async delete(filialId: string, userId: string, id: string, ip?: string) {
    const existing = await this.repo.findById(id, filialId);
    if (!existing) throw new NotFoundError('Transação');

    await this.repo.delete(id);

    await createAuditLog({
      userId,
      filialId,
      action: 'DELETE',
      entityType: 'Transacao',
      entityId: id,
      ipAddress: ip,
    });
  }

  async deleteLote(filialId: string, userId: string, ids: string[], ip?: string) {
    const existing = await this.repo.findManyByIds(ids, filialId);
    const validIds = existing.map((t) => t.id);

    if (validIds.length === 0) return { deleted: 0 };

    await this.repo.deleteMany(validIds);

    // L2: audit logs em paralelo — N awaits sequenciais → Promise.all
    await Promise.all(
      validIds.map((entityId) =>
        createAuditLog({
          userId,
          filialId,
          action: 'DELETE',
          entityType: 'Transacao',
          entityId,
          ipAddress: ip,
        }),
      ),
    );

    return { deleted: validIds.length };
  }

  async updateLote(filialId: string, userId: string, data: BulkUpdateInput, ip?: string) {
    const existing = await this.repo.findManyByIds(data.ids, filialId);
    const validIds = existing.map((t) => t.id);

    if (validIds.length === 0) throw new ValidationError('Nenhuma transação válida encontrada');

    if (data.categoriaId) {
      const cat = await prisma.categoriaFinanceira.findFirst({ where: { id: data.categoriaId, filialId, removida: false } });
      if (!cat) throw new NotFoundError('Categoria');
    }

    const updateData: Parameters<typeof this.repo.update>[1] = {};
    if (data.categoriaId) updateData.categoriaId = data.categoriaId;
    if (data.tipo) updateData.tipo = data.tipo as TransacaoTipo;
    // M2: sufixo -03:00 garante interpretação BRT — evita shift de 1 dia em servidor UTC
    if (data.dataTransacao) updateData.dataTransacao = new Date(data.dataTransacao + 'T00:00:00-03:00');

    await prisma.$transaction(
      validIds.map((id) => prisma.transacao.update({ where: { id }, data: updateData }))
    );

    // L2: audit logs em paralelo — N awaits sequenciais → Promise.all
    await Promise.all(
      validIds.map((id) =>
        createAuditLog({
          userId,
          filialId,
          action: 'UPDATE',
          entityType: 'Transacao',
          entityId: id,
          newValues: updateData as unknown as import('@prisma/client').Prisma.InputJsonValue,
          ipAddress: ip,
        }),
      ),
    );

    return { updated: validIds.length };
  }

  async listByPeriodo(filialId: string, mes: number, ano: number) {
    const transacoes = await this.repo.findByFilialPeriodo(filialId, mes, ano);
    return transacoes.map((t) => ({ ...t, valor: Number(t.valor) }));
  }

  async listByDateRange(filialId: string, dataInicio: string, dataFim: string) {
    const inicio = new Date(dataInicio + 'T00:00:00-03:00');
    const fim = new Date(dataFim + 'T23:59:59-03:00');
    const transacoes = await this.repo.findByFilialDateRange(filialId, inicio, fim);
    return transacoes.map((t) => ({ ...t, valor: Number(t.valor) }));
  }
}
