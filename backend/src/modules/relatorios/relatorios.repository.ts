// RelatoriosRepository — queries Prisma (S025/S028)

import { prisma } from '../../config/database';

export class RelatoriosRepository {
  // S025 — Inadimplentes com dados do aluno e responsável financeiro
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

  // S028 — Transações do período agrupadas por categoria
  async findTransacoesPeriodo(filialId: string, mes: number, ano: number) {
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

  // S028 — Mensalidades pagas no período (por dataPagamento)
  async sumMensalidadesPagas(filialId: string, mes: number, ano: number) {
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
}
