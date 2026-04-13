// Relatórios — S025 (inadimplência) + S028 (fluxo de caixa)

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface Inadimplente {
  mensalidadeId: string;
  alunoNome: string;
  responsavelNome: string | null;
  responsavelTelefone: string | null;
  valorOriginal: number;
  dataVencimento: string;
  diasAtraso: number;
}

interface FluxoCaixa {
  mes: number;
  ano: number;
  receitaMensalidades: number;
  totalReceitas: number;
  totalDespesas: number;
  saldo: number;
  porCategoria: { nome: string; tipo: string; total: number }[];
}

const MESES = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

type Aba = 'inadimplencia' | 'fluxo';

export default function RelatoriosPage() {
  const now = new Date();
  const [aba, setAba] = useState<Aba>('inadimplencia');
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());

  const { data: inadimplentes = [], isLoading: loadingInad } = useQuery<Inadimplente[]>({
    queryKey: ['relatorios', 'inadimplencia', mes, ano],
    queryFn: () => api.get(`/relatorios/inadimplencia?mes=${mes}&ano=${ano}`).then((r) => r.data),
    enabled: aba === 'inadimplencia',
  });

  const { data: fluxo, isLoading: loadingFluxo } = useQuery<FluxoCaixa>({
    queryKey: ['relatorios', 'fluxo-caixa', mes, ano],
    queryFn: () => api.get(`/relatorios/fluxo-caixa?mes=${mes}&ano=${ano}`).then((r) => r.data),
    enabled: aba === 'fluxo',
  });

  const exportarCsv = async () => {
    const res = await api.get(`/relatorios/fluxo-caixa?mes=${mes}&ano=${ano}&format=csv`, {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `fluxo-caixa-${mes}-${ano}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>

        {/* Filtros de período */}
        <div className="flex items-center gap-2">
          <select
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          >
            {MESES.slice(1).map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
          <input
            type="number"
            value={ano}
            onChange={(e) => setAno(Number(e.target.value))}
            min={2020}
            className="w-20 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
      </div>

      {/* Abas */}
      <div className="border-b mb-6">
        <nav className="flex gap-0">
          {(['inadimplencia', 'fluxo'] as Aba[]).map((a) => (
            <button
              key={a}
              onClick={() => setAba(a)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                aba === a ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {a === 'inadimplencia' ? 'Inadimplência' : 'Fluxo de Caixa'}
            </button>
          ))}
        </nav>
      </div>

      {/* Aba Inadimplência */}
      {aba === 'inadimplencia' && (
        <div>
          {loadingInad ? (
            <div className="text-center text-gray-400 py-12">Carregando...</div>
          ) : inadimplentes.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-gray-400">
              Nenhum aluno inadimplente em {MESES[mes]}/{ano}.
            </div>
          ) : (
            <div className="rounded-xl bg-white shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Aluno</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Responsável</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Valor</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Vencimento</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Dias em Atraso</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {inadimplentes.map((item) => (
                    <tr key={item.mensalidadeId}>
                      <td className="px-4 py-3 font-medium text-gray-900">{item.alunoNome}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {item.responsavelNome ?? '—'}
                        {item.responsavelTelefone && (
                          <span className="block text-xs text-gray-400">{item.responsavelTelefone}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {item.valorOriginal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {new Date(item.dataVencimento).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-red-600 font-medium">{item.diasAtraso} dias</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Aba Fluxo de Caixa */}
      {aba === 'fluxo' && (
        <div className="space-y-4">
          {loadingFluxo ? (
            <div className="text-center text-gray-400 py-12">Carregando...</div>
          ) : fluxo ? (
            <>
              {/* Cards resumo */}
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-xl bg-green-50 p-4 text-center">
                  <p className="text-sm text-green-600 font-medium">Total Receitas</p>
                  <p className="text-2xl font-bold text-green-700 mt-1">
                    {fluxo.totalReceitas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
                <div className="rounded-xl bg-red-50 p-4 text-center">
                  <p className="text-sm text-red-600 font-medium">Total Despesas</p>
                  <p className="text-2xl font-bold text-red-700 mt-1">
                    {fluxo.totalDespesas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
                <div className={`rounded-xl p-4 text-center ${fluxo.saldo >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
                  <p className={`text-sm font-medium ${fluxo.saldo >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>Saldo</p>
                  <p className={`text-2xl font-bold mt-1 ${fluxo.saldo >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                    {fluxo.saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
              </div>

              {/* Detalhamento por categoria */}
              {fluxo.porCategoria.length > 0 && (
                <div className="rounded-xl bg-white shadow-sm p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Por Categoria</h3>
                  <div className="space-y-2">
                    {fluxo.porCategoria.map((c, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${c.tipo === 'RECEITA' ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span className="text-sm text-gray-700">{c.nome}</span>
                          <span className="text-xs text-gray-400">({c.tipo})</span>
                        </div>
                        <span className={`text-sm font-medium ${c.tipo === 'RECEITA' ? 'text-green-700' : 'text-red-700'}`}>
                          {c.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={exportarCsv}
                  className="rounded-md border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  Exportar CSV
                </button>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
