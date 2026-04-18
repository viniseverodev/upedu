// DashboardRepository — queries Prisma (S030)

import { prisma } from '../../config/database';

export class DashboardRepository {
  // Contagem de alunos por status
  async countAlunosByStatus(filialId: string) {
    const results = await prisma.aluno.groupBy({
      by: ['status'],
      where: { filialId, deletedAt: null },
      _count: { status: true },
    });
    const map = Object.fromEntries(results.map((r) => [r.status, r._count.status]));
    return {
      ativo: map['ATIVO'] ?? 0,
      inativo: map['INATIVO'] ?? 0,
      listaEspera: map['LISTA_ESPERA'] ?? 0,
      preMatricula: map['PRE_MATRICULA'] ?? 0,
      transferido: map['TRANSFERIDO'] ?? 0,
    };
  }

  // Alunos ativos por turno
  async countAlunosByTurno(filialId: string) {
    const results = await prisma.aluno.groupBy({
      by: ['turno'],
      where: { filialId, status: 'ATIVO', deletedAt: null },
      _count: { turno: true },
    });
    const map = Object.fromEntries(results.map((r) => [r.turno, r._count.turno]));
    return {
      manha: map['MANHA'] ?? 0,
      tarde: map['TARDE'] ?? 0,
    };
  }

  // Receita do período (mensalidades pagas entre dataInicio (inclusive) e dataFim (exclusive))
  async receitaPeriodo(filialId: string, dataInicio: Date, dataFim: Date) {
    const result = await prisma.mensalidade.aggregate({
      where: {
        filialId,
        status: 'PAGO',
        dataPagamento: { gte: dataInicio, lt: dataFim },
      },
      _sum: { valorPago: true },
    });
    return Number(result._sum.valorPago ?? 0);
  }

  // Número de alunos inadimplentes
  async countInadimplentes(filialId: string) {
    const result = await prisma.mensalidade.findMany({
      where: { filialId, status: 'INADIMPLENTE' },
      distinct: ['alunoId'],
      select: { alunoId: true },
    });
    return result.length;
  }

  // Matrículas ativas
  async matriculasAtivas(filialId: string) {
    return prisma.matricula.count({ where: { filialId, status: 'ATIVA' } });
  }

  // Entradas e saídas do período (Transacao)
  async transacoesPeriodo(filialId: string, dataInicio: Date, dataFim: Date) {
    const [entradas, saidas] = await Promise.all([
      prisma.transacao.aggregate({
        where: { filialId, tipo: 'ENTRADA', dataTransacao: { gte: dataInicio, lte: dataFim } },
        _sum: { valor: true },
      }),
      prisma.transacao.aggregate({
        where: { filialId, tipo: 'SAIDA', dataTransacao: { gte: dataInicio, lte: dataFim } },
        _sum: { valor: true },
      }),
    ]);
    return {
      entradas: Number(entradas._sum.valor ?? 0),
      saidas: Number(saidas._sum.valor ?? 0),
    };
  }

  // Evolução mensal: últimos N meses de alunos ativos e receita
  async evolucaoMensal(filialId: string, meses: number) {
    const pontos: { mes: string; alunosAtivos: number; receita: number }[] = [];
    const hoje = new Date();

    for (let i = meses - 1; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const inicio = new Date(d.getFullYear(), d.getMonth(), 1);
      const fim = new Date(d.getFullYear(), d.getMonth() + 1, 1);

      const [alunosAtivos, receitaRaw] = await Promise.all([
        prisma.aluno.count({
          where: { filialId, status: 'ATIVO', deletedAt: null },
        }),
        prisma.mensalidade.aggregate({
          where: {
            filialId,
            status: 'PAGO',
            dataPagamento: { gte: inicio, lt: fim },
          },
          _sum: { valorPago: true },
        }),
      ]);

      const label = inicio.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      pontos.push({
        mes: label.replace('.', '').replace(' ', '/'),
        alunosAtivos,
        receita: Number(receitaRaw._sum.valorPago ?? 0),
      });
    }

    return pontos;
  }

  // S031 — Lista filiais ativas de uma organização
  async getFilialsByOrg(orgId: string) {
    return prisma.filial.findMany({
      where: { organizationId: orgId, ativo: true },
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' },
    });
  }
}
