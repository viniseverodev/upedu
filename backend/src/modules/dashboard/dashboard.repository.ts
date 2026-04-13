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

  // Receita do mês (mensalidades pagas no mês)
  async receitaMes(filialId: string, mes: number, ano: number) {
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

  // Número de alunos inadimplentes
  async countInadimplentes(filialId: string) {
    // Conta alunos distintos com mensalidade INADIMPLENTE
    const result = await prisma.mensalidade.findMany({
      where: { filialId, status: 'INADIMPLENTE' },
      distinct: ['alunoId'],
      select: { alunoId: true },
    });
    return result.length;
  }

  // Taxa de ocupação: matrículas ATIVAS / capacidade (não temos capacidade no schema, usamos total de alunos ATIVOS)
  async matriculasAtivas(filialId: string) {
    return prisma.matricula.count({ where: { filialId, status: 'ATIVA' } });
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
