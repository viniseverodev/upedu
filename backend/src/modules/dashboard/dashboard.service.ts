// DashboardService — lógica de negócio (S030)
// KPIs com cache Redis (TTL 5min) — chave: kpis:filial:{filialId}:mes:{YYYY-MM}

import { DashboardRepository } from './dashboard.repository';
import { redis, REDIS_TTL } from '../../config/redis';

export class DashboardService {
  private repo = new DashboardRepository();

  async getKpis(filialId: string, mes?: number, ano?: number) {
    const now = new Date();
    const m = mes ?? now.getMonth() + 1;
    const a = ano ?? now.getFullYear();
    const cacheKey = `kpis:filial:${filialId}:mes:${a}-${String(m).padStart(2, '0')}`;

    // Tentar cache Redis
    const cached = await redis.get(cacheKey).catch(() => null);
    if (cached) {
      return JSON.parse(cached);
    }

    // Calcular do banco
    const [alunos, receitaMes, inadimplentes, matriculasAtivas] = await Promise.all([
      this.repo.countAlunosByStatus(filialId),
      this.repo.receitaMes(filialId, m, a),
      this.repo.countInadimplentes(filialId),
      this.repo.matriculasAtivas(filialId),
    ]);

    const totalAlunos = alunos.ativo + alunos.inativo + alunos.listaEspera;
    const taxaOcupacao = totalAlunos > 0
      ? Math.round((alunos.ativo / totalAlunos) * 100)
      : 0;

    const kpis = {
      alunos,
      matriculasAtivas,
      receitaMes,
      inadimplentes,
      taxaOcupacao,
      mes: m,
      ano: a,
    };

    // Salvar no cache
    await redis.set(cacheKey, JSON.stringify(kpis), 'EX', REDIS_TTL.KPI_CACHE).catch(() => null);

    return kpis;
  }

  // Invalida cache de KPIs da filial (chamado após pagamento, etc.)
  static async invalidarCache(filialId: string, mes: number, ano: number) {
    const cacheKey = `kpis:filial:${filialId}:mes:${ano}-${String(mes).padStart(2, '0')}`;
    await redis.del(cacheKey).catch(() => null);
  }
}
