// DashboardService — lógica de negócio (S030)
// KPIs com cache Redis (TTL 5min) para consultas mensais
// Consultas por intervalo de datas: cache curto (1min) para evitar explosão de chaves

import { DashboardRepository } from './dashboard.repository';
import { redis, REDIS_TTL } from '../../config/redis';
import { logger } from '../../config/logger';

interface KpisParams {
  mes?: number;
  ano?: number;
  dataInicio?: string; // YYYY-MM-DD
  dataFim?: string;    // YYYY-MM-DD
}

function resolvePeriodo(params: KpisParams): { inicio: Date; fim: Date; cacheKey: string | null } {
  // Prioridade: intervalo de datas explícito > mês/ano
  if (params.dataInicio && params.dataFim) {
    // M4: sufixo -03:00 garante interpretação BRT — evita shift de período em servidor UTC
    const inicio = new Date(`${params.dataInicio}T00:00:00-03:00`);
    const fim = new Date(`${params.dataFim}T23:59:59.999-03:00`);
    return { inicio, fim, cacheKey: null }; // sem cache para ranges personalizados
  }

  const now = new Date();
  const m = params.mes ?? now.getMonth() + 1;
  const a = params.ano ?? now.getFullYear();
  // BUG-004: sufixo -03:00 garante interpretação BRT — new Date(a, m-1, 1) cria UTC e desvia o período
  const mesStr = String(m).padStart(2, '0');
  const nextM = m === 12 ? 1 : m + 1;
  const nextA = m === 12 ? a + 1 : a;
  const nextMStr = String(nextM).padStart(2, '0');
  const inicio = new Date(`${a}-${mesStr}-01T00:00:00-03:00`);
  const fim = new Date(`${nextA}-${nextMStr}-01T00:00:00-03:00`);
  return { inicio, fim, cacheKey: `kpis:filial:__FILIAL__:mes:${a}-${mesStr}` };
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
      // M12: logar falha de escrita no cache para diagnóstico (não bloqueia a resposta)
      await redis.set(cacheKey, JSON.stringify(kpis), 'EX', REDIS_TTL.KPI_CACHE).catch((err) => {
        logger.warn({ err, cacheKey }, '[DashboardService] Falha ao escrever cache Redis');
      });
    }

    return kpis;
  }

  // S031 — KPIs comparativos de todas as filiais da organização
  // M4: processa em lotes de 5 para evitar sobrecarga do pool de conexões com N filiais simultâneas
  async getComparativo(orgId: string, params: KpisParams = {}) {
    const filiais = await this.repo.getFilialsByOrg(orgId);
    const BATCH_SIZE = 5;
    const resultado: Array<{ filialId: string; filialNome: string }> = [];

    for (let i = 0; i < filiais.length; i += BATCH_SIZE) {
      const batch = filiais.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (filial) => {
          const kpis = await this.getKpis(filial.id, params);
          return { filialId: filial.id, filialNome: filial.nome, ...kpis };
        }),
      );
      resultado.push(...batchResults);
    }

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
