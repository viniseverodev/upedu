// DashboardService — lógica de negócio (S030)
// KPIs com cache Redis (TTL 5min) para consultas mensais
// Consultas por intervalo de datas: cache curto (1min) para evitar explosão de chaves

import { DashboardRepository } from './dashboard.repository';
import { redis, REDIS_TTL } from '../../config/redis';

interface KpisParams {
  mes?: number;
  ano?: number;
  dataInicio?: string; // YYYY-MM-DD
  dataFim?: string;    // YYYY-MM-DD
}

function resolvePeriodo(params: KpisParams): { inicio: Date; fim: Date; cacheKey: string | null } {
  // Prioridade: intervalo de datas explícito > mês/ano
  if (params.dataInicio && params.dataFim) {
    const inicio = new Date(`${params.dataInicio}T00:00:00`);
    const fim = new Date(`${params.dataFim}T23:59:59.999`);
    return { inicio, fim, cacheKey: null }; // sem cache para ranges personalizados
  }

  const now = new Date();
  const m = params.mes ?? now.getMonth() + 1;
  const a = params.ano ?? now.getFullYear();
  const inicio = new Date(a, m - 1, 1);
  const fim = new Date(a, m, 1);
  return { inicio, fim, cacheKey: `kpis:filial:__FILIAL__:mes:${a}-${String(m).padStart(2, '0')}` };
}

export class DashboardService {
  private repo = new DashboardRepository();

  async getKpis(filialId: string, params: KpisParams = {}) {
    const { inicio, fim, cacheKey: rawKey } = resolvePeriodo(params);
    const cacheKey = rawKey?.replace('__FILIAL__', filialId) ?? null;

    // Tentar cache Redis (apenas para consultas mensais)
    if (cacheKey) {
      const cached = await redis.get(cacheKey).catch(() => null);
      if (cached) {
        try { return JSON.parse(cached); } catch { /* recalcular */ }
      }
    }

    const [alunos, alunosPorTurno, receitaPeriodo, inadimplentes, matriculasAtivas, transacoes] = await Promise.all([
      this.repo.countAlunosByStatus(filialId),
      this.repo.countAlunosByTurno(filialId),
      this.repo.receitaPeriodo(filialId, inicio, fim),
      this.repo.countInadimplentes(filialId),
      this.repo.matriculasAtivas(filialId),
      this.repo.transacoesPeriodo(filialId, inicio, fim),
    ]);

    const totalAlunos = alunos.ativo + alunos.inativo + alunos.listaEspera;
    const taxaOcupacao = totalAlunos > 0
      ? Math.round((alunos.ativo / totalAlunos) * 100)
      : 0;

    const kpis = {
      alunos,
      alunosPorTurno,
      matriculasAtivas,
      receitaPeriodo,
      inadimplentes,
      taxaOcupacao,
      transacoes,
      periodo: { inicio: inicio.toISOString(), fim: fim.toISOString() },
    };

    if (cacheKey) {
      await redis.set(cacheKey, JSON.stringify(kpis), 'EX', REDIS_TTL.KPI_CACHE).catch(() => null);
    }

    return kpis;
  }

  // S031 — KPIs comparativos de todas as filiais da organização
  async getComparativo(orgId: string, params: KpisParams = {}) {
    const filiais = await this.repo.getFilialsByOrg(orgId);

    const resultado = await Promise.all(
      filiais.map(async (filial) => {
        const kpis = await this.getKpis(filial.id, params);
        return { filialId: filial.id, filialNome: filial.nome, ...kpis };
      }),
    );

    return resultado;
  }

  // Evolução mensal de alunos ativos e receita (últimos N meses)
  async getEvolucao(filialId: string, meses = 6) {
    return this.repo.evolucaoMensal(filialId, meses);
  }

  // Invalida cache de KPIs da filial (chamado após pagamento, etc.)
  static async invalidarCache(filialId: string, mes: number, ano: number) {
    const cacheKey = `kpis:filial:${filialId}:mes:${ano}-${String(mes).padStart(2, '0')}`;
    await redis.del(cacheKey).catch(() => null);
  }
}
