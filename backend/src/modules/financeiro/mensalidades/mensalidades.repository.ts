// MensalidadesRepository — queries Prisma (S022/S023/S024/S025)

import { prisma } from '../../../config/database';
import type { MensalidadeStatus } from '@prisma/client';

export class MensalidadesRepository {
  async create(data: {
    alunoId: string;
    filialId: string;
    mesReferencia: number;
    anoReferencia: number;
    valorOriginal: number;
    dataVencimento: Date;
  }) {
    return prisma.mensalidade.create({ data });
  }

  async findById(id: string) {
    return prisma.mensalidade.findUnique({ where: { id } });
  }

  async findByIdAndFilial(id: string, filialId: string) {
    return prisma.mensalidade.findFirst({ where: { id, filialId } });
  }

  // Idempotência — verifica se já existe para aluno/mês/ano
  async findByAlunoMesAno(alunoId: string, mesReferencia: number, anoReferencia: number) {
    return prisma.mensalidade.findUnique({
      where: { alunoId_mesReferencia_anoReferencia: { alunoId, mesReferencia, anoReferencia } },
    });
  }

  async update(id: string, data: {
    status?: MensalidadeStatus;
    valorPago?: number;
    valorDesconto?: number;
    formaPagamento?: string | null;
    dataPagamento?: Date | null;
  }) {
    return prisma.mensalidade.update({ where: { id }, data });
  }

  // S025 — Job: busca PENDENTE com vencimento < hoje
  async findOverdue(today: Date) {
    return prisma.mensalidade.findMany({
      where: { status: 'PENDENTE', dataVencimento: { lt: today } },
      select: { id: true },
    });
  }

  // S025 — Atualiza múltiplos para INADIMPLENTE
  async updateManyToInadimplente(ids: string[]) {
    return prisma.mensalidade.updateMany({
      where: { id: { in: ids } },
      data: { status: 'INADIMPLENTE' },
    });
  }

  // S025 — Relatório de inadimplência
  async findInadimplentes(filialId: string, mesReferencia: number, anoReferencia: number) {
    return prisma.mensalidade.findMany({
      where: { filialId, mesReferencia, anoReferencia, status: 'INADIMPLENTE' },
      include: {
        aluno: {
          select: {
            nome: true,
            responsaveis: {
              where: { isResponsavelFinanceiro: true },
              include: { responsavel: { select: { nome: true, telefone: true } } },
            },
          },
        },
      },
      orderBy: { dataVencimento: 'asc' },
    });
  }

  // S028 — Soma de mensalidades pagas no mês (por data de pagamento)
  async sumPagoNoMes(filialId: string, mes: number, ano: number) {
    const result = await prisma.mensalidade.aggregate({
      where: {
        filialId,
        status: 'PAGO',
        dataPagamento: {
          gte: new Date(ano, mes - 1, 1),
          lt: new Date(ano, mes, 1),
        },
      },
      _sum: { valorPago: true },
    });
    return Number(result._sum.valorPago ?? 0);
  }

  // S030 — Contar inadimplentes por filial
  async countInadimplentes(filialId: string) {
    return prisma.mensalidade.count({
      where: { filialId, status: 'INADIMPLENTE' },
    });
  }
}
