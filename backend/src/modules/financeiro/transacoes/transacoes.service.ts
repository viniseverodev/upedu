// TransacoesService — lógica de negócio (S027)

import { TransacoesRepository } from './transacoes.repository';
import { createAuditLog } from '../../../middlewares/audit';
import { NotFoundError } from '../../../shared/errors/AppError';
import { prisma } from '../../../config/database';
import type { CreateTransacaoInput } from './transacoes.schema';

export class TransacoesService {
  private repo = new TransacoesRepository();

  async create(filialId: string, userId: string, data: CreateTransacaoInput) {
    // Verificar categoria pertence à filial
    const categoria = await prisma.categoriaFinanceira.findFirst({
      where: { id: data.categoriaId, filialId },
    });
    if (!categoria) throw new NotFoundError('Categoria');

    const transacao = await this.repo.create({
      filialId,
      categoriaId: data.categoriaId,
      tipo: data.tipo,
      descricao: data.descricao,
      valor: data.valor,
      dataTransacao: new Date(data.dataTransacao),
    });

    await createAuditLog({
      userId,
      action: 'CREATE',
      entityType: 'Transacao',
      entityId: transacao.id,
      newValues: {
        tipo: data.tipo,
        valor: data.valor,
        categoriaId: data.categoriaId,
      } as unknown as import('@prisma/client').Prisma.InputJsonValue,
    });

    return {
      ...transacao,
      valor: Number(transacao.valor),
    };
  }

  async listByPeriodo(filialId: string, mes: number, ano: number) {
    const transacoes = await this.repo.findByFilialPeriodo(filialId, mes, ano);
    return transacoes.map((t) => ({ ...t, valor: Number(t.valor) }));
  }
}
