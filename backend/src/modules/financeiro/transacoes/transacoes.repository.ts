// TransacoesRepository — queries Prisma (S027/S028)

import { prisma } from '../../../config/database';
import type { TransacaoTipo } from '@prisma/client';

export class TransacoesRepository {
  async create(data: {
    filialId: string;
    categoriaId: string;
    tipo: TransacaoTipo;
    descricao: string;
    valor: number;
    dataTransacao: Date;
  }) {
    return prisma.transacao.create({
      data,
      include: { categoria: { select: { nome: true, tipo: true } } },
    });
  }

  async findByFilialPeriodo(filialId: string, mes: number, ano: number) {
    return prisma.transacao.findMany({
      where: {
        filialId,
        dataTransacao: {
          gte: new Date(ano, mes - 1, 1),
          lt: new Date(ano, mes, 1),
        },
      },
      include: { categoria: { select: { nome: true, tipo: true } } },
      orderBy: { dataTransacao: 'asc' },
    });
  }

  // S028 — Agrupa por categoria para fluxo de caixa
  async sumByCategoria(filialId: string, mes: number, ano: number) {
    return prisma.transacao.groupBy({
      by: ['categoriaId', 'tipo'],
      where: {
        filialId,
        dataTransacao: {
          gte: new Date(ano, mes - 1, 1),
          lt: new Date(ano, mes, 1),
        },
      },
      _sum: { valor: true },
    });
  }
}
