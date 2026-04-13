// Dashboard KPIs — S030 + S031
// S030: KPIs da filial ativa (cache Redis TTL 5min)
// S031: Comparativo entre filiais (ADMIN_MATRIZ / SUPER_ADMIN)

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

interface FilialKpi {
  filialId: string;
  filialNome: string;
  alunos: { ativo: number; inativo: number; listaEspera: number };
  matriculasAtivas: number;
  receitaMes: number;
  inadimplentes: number;
  taxaOcupacao: number;
}

interface KpiData {
  alunos: {
    ativo: number;
    inativo: number;
    listaEspera: number;
    preMatricula: number;
    transferido: number;
  };
  matriculasAtivas: number;
  receitaMes: number;
  inadimplentes: number;
  taxaOcupacao: number;
  mes: number;
  ano: number;
}

const MESES = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export default function KpisPage() {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN_MATRIZ' || user?.role === 'SUPER_ADMIN';

  const { data: kpis, isLoading, error } = useQuery<KpiData>({
    queryKey: ['dashboard', 'kpis', mes, ano],
    queryFn: () => api.get(`/dashboard/kpis?mes=${mes}&ano=${ano}`).then((r) => r.data),
    staleTime: 5 * 60 * 1000, // 5min — espelha TTL do cache Redis
  });

  // S031 — Comparativo entre filiais (só para ADMIN_MATRIZ / SUPER_ADMIN)
  const { data: comparativo, isLoading: loadingComp } = useQuery<FilialKpi[]>({
    queryKey: ['dashboard', 'comparativo', mes, ano],
    queryFn: () => api.get(`/dashboard/kpis/comparativo?mes=${mes}&ano=${ano}`).then((r) => r.data),
    enabled: isAdmin,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          {kpis && (
            <p className="text-sm text-gray-500 mt-0.5">
              {MESES[kpis.mes]} / {kpis.ano}
            </p>
          )}
        </div>

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

      {isLoading && (
        <div className="text-center text-gray-400 py-12">Carregando...</div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          Erro ao carregar dados do dashboard. Verifique se você tem acesso à filial.
        </div>
      )}

      {kpis && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              label="Alunos Ativos"
              value={kpis.alunos.ativo}
              color="green"
              suffix="alunos"
            />
            <KpiCard
              label="Inadimplentes"
              value={kpis.inadimplentes}
              color={kpis.inadimplentes > 0 ? 'red' : 'green'}
              suffix="alunos"
            />
            <KpiCard
              label="Receita do Mês"
              value={kpis.receitaMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              color="blue"
            />
            <KpiCard
              label="Taxa de Ocupação"
              value={`${kpis.taxaOcupacao}%`}
              color={kpis.taxaOcupacao >= 80 ? 'green' : kpis.taxaOcupacao >= 50 ? 'yellow' : 'red'}
            />
          </div>

          {/* Detalhe de alunos */}
          <div className="rounded-xl bg-white shadow-sm p-6">
            <h2 className="text-sm font-medium text-gray-700 mb-4">Distribuição de Alunos</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <StatusCard label="Ativos" value={kpis.alunos.ativo} color="green" />
              <StatusCard label="Inativos" value={kpis.alunos.inativo} color="gray" />
              <StatusCard label="Lista de Espera" value={kpis.alunos.listaEspera} color="yellow" />
              <StatusCard label="Pré-Matrícula" value={kpis.alunos.preMatricula} color="blue" />
              <StatusCard label="Transferidos" value={kpis.alunos.transferido} color="purple" />
            </div>
          </div>

          {/* Matrículas */}
          <div className="rounded-xl bg-white shadow-sm p-6">
            <h2 className="text-sm font-medium text-gray-700 mb-2">Matrículas Ativas</h2>
            <p className="text-3xl font-bold text-gray-900">{kpis.matriculasAtivas}</p>
          </div>
        </div>
      )}

      {/* S031 — Comparativo entre filiais */}
      {isAdmin && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Comparativo entre Filiais</h2>
          {loadingComp ? (
            <div className="text-center text-gray-400 py-8">Carregando comparativo...</div>
          ) : comparativo && comparativo.length > 0 ? (
            <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Filial</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Alunos Ativos</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Matrículas</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Receita do Mês</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Inadimplentes</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Ocupação</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {comparativo.map((f) => (
                    <tr key={f.filialId}>
                      <td className="px-4 py-3 font-medium text-gray-900">{f.filialNome}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{f.alunos.ativo}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{f.matriculasAtivas}</td>
                      <td className="px-4 py-3 text-right text-green-700 font-medium">
                        {f.receitaMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${f.inadimplentes > 0 ? 'text-red-700' : 'text-gray-500'}`}>
                        {f.inadimplentes}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-medium ${f.taxaOcupacao >= 80 ? 'text-green-700' : f.taxaOcupacao >= 50 ? 'text-yellow-700' : 'text-red-700'}`}>
                          {f.taxaOcupacao}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  color,
  suffix,
}: {
  label: string;
  value: string | number;
  color: 'green' | 'red' | 'blue' | 'yellow';
  suffix?: string;
}) {
  const colorMap = {
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-700',
    blue: 'bg-blue-50 text-blue-700',
    yellow: 'bg-yellow-50 text-yellow-700',
  };

  return (
    <div className={`rounded-xl p-4 ${colorMap[color]}`}>
      <p className="text-xs font-medium opacity-75">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {suffix && <p className="text-xs opacity-60 mt-0.5">{suffix}</p>}
    </div>
  );
}

function StatusCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: 'green' | 'gray' | 'yellow' | 'blue' | 'purple';
}) {
  const colorMap = {
    green: 'text-green-600',
    gray: 'text-gray-500',
    yellow: 'text-yellow-600',
    blue: 'text-blue-600',
    purple: 'text-purple-600',
  };

  return (
    <div className="text-center">
      <p className={`text-2xl font-bold ${colorMap[color]}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}
