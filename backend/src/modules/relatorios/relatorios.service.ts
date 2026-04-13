// RelatoriosService — lógica de negócio (S025/S028)
// S025: GET /relatorios/inadimplencia
// S028: GET /relatorios/fluxo-caixa (+ format=csv)

import { RelatoriosRepository } from './relatorios.repository';

export class RelatoriosService {
  private repo = new RelatoriosRepository();

  // S025 — Relatório de inadimplência
  async inadimplencia(filialId: string, mes: number, ano: number) {
    const inadimplentes = await this.repo.findInadimplentes(filialId, mes, ano);

    const hoje = new Date();
    return inadimplentes.map((m) => {
      const diasAtraso = Math.max(
        0,
        Math.floor((hoje.getTime() - m.dataVencimento.getTime()) / (1000 * 60 * 60 * 24)),
      );
      const respFinanceiro = m.aluno.responsaveis[0]?.responsavel ?? null;

      return {
        mensalidadeId: m.id,
        alunoNome: m.aluno.nome,
        responsavelNome: respFinanceiro?.nome ?? null,
        responsavelTelefone: respFinanceiro?.telefone ?? null,
        valorOriginal: Number(m.valorOriginal),
        dataVencimento: m.dataVencimento,
        diasAtraso,
      };
    });
  }

  // S028 — Fluxo de caixa
  async fluxoCaixa(filialId: string, mes: number, ano: number) {
    const [transacoes, receitaMensalidades] = await Promise.all([
      this.repo.findTransacoesPeriodo(filialId, mes, ano),
      this.repo.sumMensalidadesPagas(filialId, mes, ano),
    ]);

    // Agrupamento por categoria
    const porCategoria: Record<string, { nome: string; tipo: string; total: number }> = {};
    let totalReceitas = receitaMensalidades;
    let totalDespesas = 0;

    for (const t of transacoes) {
      const chave = t.categoriaId;
      if (!porCategoria[chave]) {
        porCategoria[chave] = { nome: t.categoria.nome, tipo: t.categoria.tipo, total: 0 };
      }
      const valor = Number(t.valor);
      porCategoria[chave].total += valor;

      if (t.tipo === 'ENTRADA') totalReceitas += valor;
      else totalDespesas += valor;
    }

    return {
      mes,
      ano,
      receitaMensalidades,
      totalReceitas,
      totalDespesas,
      saldo: totalReceitas - totalDespesas,
      porCategoria: Object.values(porCategoria),
    };
  }

  // S028 — Exportação CSV
  async fluxoCaixaCsv(filialId: string, mes: number, ano: number): Promise<string> {
    const transacoes = await this.repo.findTransacoesPeriodo(filialId, mes, ano);
    const header = 'data,tipo,categoria,descricao,valor\n';
    const rows = transacoes.map((t) =>
      [
        t.dataTransacao.toISOString().split('T')[0],
        t.tipo,
        t.categoria.nome,
        `"${t.descricao.replace(/"/g, '""')}"`,
        Number(t.valor).toFixed(2),
      ].join(','),
    );
    return header + rows.join('\n');
  }
}
