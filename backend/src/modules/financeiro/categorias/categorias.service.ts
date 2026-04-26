// CategoriasService — lógica de negócio (S027)

import { CategoriasRepository } from './categorias.repository';
import { createAuditLog } from '../../../middlewares/audit';
import { NotFoundError, ValidationError } from '../../../shared/errors/AppError';
import { prisma } from '../../../config/database';
import type { CreateCategoriaInput, UpdateCategoriaInput } from './categorias.schema';
import type { CategoriaFinanceiraTipo } from '@prisma/client';

export class CategoriasService {
  private repo = new CategoriasRepository();

  async create(filialId: string, userId: string, data: CreateCategoriaInput, ip?: string) {
    const categoria = await this.repo.create({ filialId, nome: data.nome, tipo: data.tipo });

    await createAuditLog({
      userId,
      filialId,
      action: 'CREATE',
      entityType: 'CategoriaFinanceira',
      entityId: categoria.id,
      newValues: { nome: categoria.nome, tipo: categoria.tipo },
      ipAddress: ip,
    });

    return categoria;
  }

  async update(id: string, filialId: string, userId: string, data: UpdateCategoriaInput, ip?: string) {
    const categoria = await this.repo.findByIdAndFilial(id, filialId);
    if (!categoria) throw new NotFoundError('Categoria');
    if (categoria.removida) throw new ValidationError('Categoria removida não pode ser editada');

    const updateData: { nome?: string; tipo?: CategoriaFinanceiraTipo } = {};
    if (data.nome) updateData.nome = data.nome;
    if (data.tipo) updateData.tipo = data.tipo as CategoriaFinanceiraTipo;

    const updated = await this.repo.update(id, updateData);

    await createAuditLog({
      userId,
      filialId,
      action: 'UPDATE',
      entityType: 'CategoriaFinanceira',
      entityId: id,
      oldValues: { nome: categoria.nome, tipo: categoria.tipo },
      newValues: updateData as unknown as import('@prisma/client').Prisma.InputJsonValue,
      ipAddress: ip,
    });

    return updated;
  }

  async listByFilial(filialId: string) {
    return this.repo.findByFilial(filialId);
  }

  async delete(id: string, filialId: string, userId: string, ip?: string) {
    const categoria = await this.repo.findByIdAndFilial(id, filialId);
    if (!categoria) throw new NotFoundError('Categoria');
    if (categoria.removida) return;

    // H3: envolver count + delete/softDelete em $transaction para eliminar TOCTOU
    // (nova transação poderia ser criada entre o count e o delete, causando P2003)
    let wasSoftDeleted = false;
    await prisma.$transaction(async (tx) => {
      const count = await tx.transacao.count({ where: { categoriaId: id } });
      if (count > 0) {
        // Soft delete: mantém na listagem marcada como removida
        await tx.categoriaFinanceira.update({
          where: { id },
          data: { removida: true, removidaEm: new Date() },
        });
        wasSoftDeleted = true;
      } else {
        // Hard delete quando não há transações vinculadas
        await tx.categoriaFinanceira.delete({ where: { id } });
      }
    });

    if (wasSoftDeleted) {
      await createAuditLog({
        userId,
        filialId,
        action: 'UPDATE',
        entityType: 'CategoriaFinanceira',
        entityId: id,
        oldValues: { removida: false },
        newValues: { removida: true } as unknown as import('@prisma/client').Prisma.InputJsonValue,
        ipAddress: ip,
      });
    } else {
      await createAuditLog({
        userId,
        filialId,
        action: 'DELETE',
        entityType: 'CategoriaFinanceira',
        entityId: id,
        oldValues: { nome: categoria.nome, tipo: categoria.tipo },
        ipAddress: ip,
      });
    }
  }
}
