// RelatoriosRepository — queries Prisma (S025/S028)

import { prisma } from '../../config/database';

export class RelatoriosRepository {
  // S025 — Inadimplentes com dados do aluno e responsável financeiro (M2: paginada)
  async findInadimplentes(
    filialId: string,
    mesReferencia: number,
    anoReferencia: number,
    page: number,
    pageSize: number,
  ) {
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
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }

  // M2: contagem total para metadados de paginação
  async countInadimplentes(filialId: string, mesReferencia: number, anoReferencia: number) {
    return prisma.mensalidade.count({
      where: { filialId, mesReferencia, anoReferencia, status: 'INADIMPLENTE' },
    });
  }

  // S028 — Transações do período agrupadas por categoria
  async findTransacoesPeriodo(filialId: string, mes: number, ano: number) {
    // BUG-003: sufixo -03:00 garante interpretação BRT — new Date(ano, mes-1, 1) cria UTC e desvia o período
    const mesStr = String(mes).padStart(2, '0');
    const nextMes = mes === 12 ? 1 : mes + 1;
    const nextAno = mes === 12 ? ano + 1 : ano;
    const nextMesStr = String(nextMes).padStart(2, '0');
    return prisma.transacao.findMany({
      where: {
        filialId,
        dataTransacao: {
          gte: new Date(`${ano}-${mesStr}-01T00:00:00-03:00`),
          lt:  new Date(`${nextAno}-${nextMesStr}-01T00:00:00-03:00`),
        },
      },
      include: { categoria: { select: { nome: true, tipo: true } } },
      orderBy: { dataTransacao: 'asc' },
    });
  }

  // S028 — Mensalidades pagas no período (por dataPagamento)
  async sumMensalidadesPagas(filialId: string, mes: number, ano: number) {
    // BUG-003: sufixo -03:00 garante interpretação BRT — evita perder registros das primeiras horas do dia
    const mesStr = String(mes).padStart(2, '0');
    const nextMes = mes === 12 ? 1 : mes + 1;
    const nextAno = mes === 12 ? ano + 1 : ano;
    const nextMesStr = String(nextMes).padStart(2, '0');
    const result = await prisma.mensalidade.aggregate({
      where: {
        filialId,
        status: 'PAGO',
        dataPagamento: {
          gte: new Date(`${ano}-${mesStr}-01T00:00:00-03:00`),
          lt:  new Date(`${nextAno}-${nextMesStr}-01T00:00:00-03:00`),
        },
      },
      _sum: { valorPago: true },
    });
    return Number(result._sum.valorPago ?? 0);
  }
}
