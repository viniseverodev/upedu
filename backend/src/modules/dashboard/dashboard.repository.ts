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
  // M7: meses processados em paralelo (Promise.all no nível do loop) — elimina 2N queries sequenciais
  async evolucaoMensal(filialId: string, meses: number) {
    const hoje = new Date();

    const pontos = await Promise.all(
      Array.from({ length: meses }, (_, idx) => meses - 1 - idx).map(async (i) => {
        // BUG-I: new Date(year, month, 1) cria meia-noite UTC = 21h BRT do dia anterior
        // sufixo -03:00 garante interpretação BRT correta nas fronteiras mensais
        const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        const mesStr = String(d.getMonth() + 1).padStart(2, '0');
        const nextMes = d.getMonth() === 11 ? 1 : d.getMonth() + 2;
        const nextAno = d.getMonth() === 11 ? d.getFullYear() + 1 : d.getFullYear();
        const nextMesStr = String(nextMes).padStart(2, '0');
        const inicio = new Date(`${d.getFullYear()}-${mesStr}-01T00:00:00-03:00`);
        const fim = new Date(`${nextAno}-${nextMesStr}-01T00:00:00-03:00`);

        const [alunosAtivos, receitaRaw] = await Promise.all([
          // BUG-006: contar matrículas ativas no período histórico, não alunos com status atual
          prisma.matricula.count({
            where: {
              filialId,
              status: 'ATIVA',
              dataInicio: { lte: fim },
              OR: [{ dataFim: null }, { dataFim: { gte: inicio } }],
            },
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
        return {
          mes: label.replace('.', '').replace(' ', '/'),
          alunosAtivos,
          receita: Number(receitaRaw._sum.valorPago ?? 0),
        };
      }),
    );

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
