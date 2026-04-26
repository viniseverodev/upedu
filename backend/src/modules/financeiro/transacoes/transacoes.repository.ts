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
      include: { categoria: { select: { nome: true, tipo: true, removida: true, removidaEm: true } } },
    });
  }

  async findById(id: string, filialId: string) {
    return prisma.transacao.findFirst({
      where: { id, filialId },
      include: { categoria: { select: { nome: true, tipo: true, removida: true, removidaEm: true } } },
    });
  }

  async findByFilialPeriodo(filialId: string, mes: number, ano: number) {
    const m = String(mes).padStart(2, '0');
    const nextMes = mes === 12 ? 1 : mes + 1;
    const nextAno = mes === 12 ? ano + 1 : ano;
    const nextM = String(nextMes).padStart(2, '0');
    return prisma.transacao.findMany({
      where: {
        filialId,
        dataTransacao: {
          gte: new Date(`${ano}-${m}-01T00:00:00-03:00`),
          lt: new Date(`${nextAno}-${nextM}-01T00:00:00-03:00`),
        },
      },
      include: { categoria: { select: { nome: true, tipo: true, removida: true, removidaEm: true } } },
      orderBy: { dataTransacao: 'asc' },
    });
  }

  async findByFilialDateRange(filialId: string, dataInicio: Date, dataFim: Date) {
    return prisma.transacao.findMany({
      where: {
        filialId,
        dataTransacao: { gte: dataInicio, lte: dataFim },
      },
      include: { categoria: { select: { nome: true, tipo: true, removida: true, removidaEm: true } } },
      orderBy: { dataTransacao: 'asc' },
    });
  }

  async update(id: string, data: {
    categoriaId?: string;
    tipo?: TransacaoTipo;
    descricao?: string;
    valor?: number;
    dataTransacao?: Date;
  }) {
    return prisma.transacao.update({
      where: { id },
      data,
      include: { categoria: { select: { nome: true, tipo: true, removida: true, removidaEm: true } } },
    });
  }

  async delete(id: string) {
    return prisma.transacao.delete({ where: { id } });
  }

  async deleteMany(ids: string[]) {
    return prisma.transacao.deleteMany({ where: { id: { in: ids } } });
  }

  async findManyByIds(ids: string[], filialId: string) {
    return prisma.transacao.findMany({ where: { id: { in: ids }, filialId } });
  }

  // S028 — Agrupa por categoria para fluxo de caixa
  async sumByCategoria(filialId: string, mes: number, ano: number) {
    return prisma.transacao.groupBy({
      by: ['categoriaId', 'tipo'],
      where: {
        filialId,
        dataTransacao: {
          // BUG-B: sufixo -03:00 garante interpretação BRT; rollover de dezembro tratado explicitamente
          gte: new Date(`${ano}-${String(mes).padStart(2, '0')}-01T00:00:00-03:00`),
          lt: new Date(`${mes === 12 ? ano + 1 : ano}-${String(mes === 12 ? 1 : mes + 1).padStart(2, '0')}-01T00:00:00-03:00`),
        },
      },
      _sum: { valor: true },
    });
  }
}
