// Relatórios — S025 (inadimplência) + S028 (fluxo de caixa)

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Inadimplente {
  mensalidadeId: string; alunoNome: string; responsavelNome: string | null;
  responsavelTelefone: string | null; valorOriginal: number;
  dataVencimento: string; diasAtraso: number;
}
interface InadimplentesResponse {
  data: Inadimplente[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
interface FluxoCaixa {
  mes: number; ano: number; receitaMensalidades: number;
  totalReceitas: number; totalDespesas: number; saldo: number;
  porCategoria: { nome: string; tipo: string; total: number }[];
}

const MESES = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
type Aba = 'inadimplencia' | 'fluxo';

export default function RelatoriosPage() {
  const now = new Date();
  const [aba, setAba] = useState<Aba>('inadimplencia');
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());

  // BUG-J: backend retorna { data, total, page, pageSize, totalPages } — não um array direto
  const { data: inadimplentesResp, isLoading: loadingInad } = useQuery<InadimplentesResponse>({
    queryKey: ['relatorios', 'inadimplencia', mes, ano],
    queryFn: () => api.get(`/relatorios/inadimplencia?mes=${mes}&ano=${ano}`).then((r) => r.data),
    enabled: aba === 'inadimplencia',
  });
  const inadimplentes = inadimplentesResp?.data ?? [];

  const { data: fluxo, isLoading: loadingFluxo } = useQuery<FluxoCaixa>({
    queryKey: ['relatorios', 'fluxo-caixa', mes, ano],
    queryFn: () => api.get(`/relatorios/fluxo-caixa?mes=${mes}&ano=${ano}`).then((r) => r.data),
    enabled: aba === 'fluxo',
  });

  const exportarCsv = async () => {
    const res = await api.get(`/relatorios/fluxo-caixa?mes=${mes}&ano=${ano}&format=csv`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = `fluxo-caixa-${mes}-${ano}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Relatórios</h1>
        <div className="flex items-center gap-2">
          <select value={mes} onChange={(e) => setMes(Number(e.target.value))} className="input-base w-28 py-2 text-xs">
            {MESES.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
          <input type="number" value={ano} onChange={(e) => setAno(Number(e.target.value))} min={2020} max={2099} className="input-base w-24 py-2 text-xs" />
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-slate-800 dark:bg-slate-900">
        {(['inadimplencia', 'fluxo'] as Aba[]).map((a) => (
          <button
            key={a}
            onClick={() => setAba(a)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              aba === a
                ? 'bg-white text-gray-900 shadow-sm dark:bg-slate-800 dark:text-slate-100'
                : 'text-gray-500 hover:text-gray-700 dark:text-slate-500 dark:hover:text-slate-300'
            }`}
          >
            {a === 'inadimplencia' ? 'Inadimplência' : 'Fluxo de Caixa'}
          </button>
        ))}
      </div>

      {/* Aba Inadimplência */}
      {aba === 'inadimplencia' && (
        loadingInad ? <div className="skeleton h-64" /> :
        inadimplentes.length === 0 ? (
          <div className="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="mx-auto mb-3 h-12 w-12 text-gray-300 dark:text-slate-700">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Sem inadimplentes em {MESES[mes]}/{ano}</p>
            <p className="mt-1 text-xs text-gray-400 dark:text-slate-600">Todos os alunos estão em dia!</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table-base">
              <thead className="table-head">
                <tr>
                  <th className="table-th">Aluno</th>
                  <th className="table-th">Responsável</th>
                  <th className="table-th text-right">Valor</th>
                  <th className="table-th">Vencimento</th>
                  <th className="table-th text-center">Dias em Atraso</th>
                </tr>
              </thead>
              <tbody>
                {inadimplentes.map((item) => (
                  <tr key={item.mensalidadeId} className="table-row">
                    <td className="table-td font-semibold text-gray-900 dark:text-slate-100">{item.alunoNome}</td>
                    <td className="table-td">
                      <p>{item.responsavelNome ?? '—'}</p>
                      {item.responsavelTelefone && <p className="text-xs text-gray-400">{item.responsavelTelefone}</p>}
                    </td>
                    <td className="table-td text-right font-medium">{formatCurrency(item.valorOriginal)}</td>
                    <td className="table-td">{formatDate(item.dataVencimento)}</td>
                    <td className="table-td text-center">
                      <span className={`badge ${item.diasAtraso > 30 ? 'badge-red' : 'badge-yellow'}`}>
                        {item.diasAtraso}d
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Aba Fluxo de Caixa */}
      {aba === 'fluxo' && (
        loadingFluxo ? <div className="skeleton h-64" /> :
        fluxo ? (
          <div className="space-y-4">
            {/* Cards resumo */}
            <div className="grid grid-cols-3 gap-4">
              <div className="card p-5 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-forest-500 dark:text-forest-300">Receitas</p>
                <p className="mt-2 text-2xl font-bold text-forest-500 dark:text-forest-300">{formatCurrency(fluxo.totalReceitas)}</p>
              </div>
              <div className="card p-5 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-crimson-500 dark:text-crimson-300">Despesas</p>
                <p className="mt-2 text-2xl font-bold text-crimson-500 dark:text-crimson-300">{formatCurrency(fluxo.totalDespesas)}</p>
              </div>
              <div className="card p-5 text-center">
                <p className={`text-xs font-semibold uppercase tracking-wide ${fluxo.saldo >= 0 ? 'text-brand-600 dark:text-brand-300' : 'text-crimson-500 dark:text-crimson-300'}`}>Saldo</p>
                <p className={`mt-2 text-2xl font-bold ${fluxo.saldo >= 0 ? 'text-brand-600 dark:text-brand-300' : 'text-crimson-500 dark:text-crimson-300'}`}>{formatCurrency(fluxo.saldo)}</p>
              </div>
            </div>

            {fluxo.porCategoria.length > 0 && (
              <div className="card p-5">
                <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-slate-300">Detalhamento por Categoria</h3>
                <div className="space-y-2.5">
                  {fluxo.porCategoria.map((c, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`h-2 w-2 rounded-full ${c.tipo === 'RECEITA' ? 'bg-forest-500' : 'bg-crimson-500'}`} />
                        <span className="text-sm text-gray-700 dark:text-slate-300">{c.nome}</span>
                        <span className={`badge ${c.tipo === 'RECEITA' ? 'badge-green' : 'badge-red'}`}>{c.tipo}</span>
                      </div>
                      <span className={`text-sm font-semibold ${c.tipo === 'RECEITA' ? 'text-forest-500 dark:text-forest-300' : 'text-crimson-500 dark:text-crimson-300'}`}>
                        {formatCurrency(c.total)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button onClick={exportarCsv} className="btn-secondary">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Exportar CSV
              </button>
            </div>
          </div>
        ) : null
      )}
    </div>
  );
}
