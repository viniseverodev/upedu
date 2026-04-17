// Dashboard KPIs — S030 + S031

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { formatCurrency } from '@/lib/utils';

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

function OccupancyBar({ value }: { value: number }) {
  const color =
    value >= 80 ? 'bg-forest-500' : value >= 50 ? 'bg-yellow-500' : 'bg-crimson-500';
  return (
    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700">
      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
  accent,
  extra,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">{label}</p>
          <p className={`mt-1.5 text-3xl font-bold ${accent}`}>{value}</p>
          {sub && <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">{sub}</p>}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent.includes('forest') ? 'bg-forest-50 text-forest-500 dark:bg-forest-700/20 dark:text-forest-200' : accent.includes('crimson') ? 'bg-crimson-50 text-crimson-500 dark:bg-crimson-700/20 dark:text-crimson-200' : accent.includes('brand') ? 'bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-300' : 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-300'}`}>
          {icon}
        </div>
      </div>
      {extra}
    </div>
  );
}

function DistribuicaoItem({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-center dark:border-slate-800 dark:bg-slate-800/50">
      <span className={`text-xl font-bold ${color}`}>{value}</span>
      <span className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">{label}</span>
    </div>
  );
}

export default function KpisPage() {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN_MATRIZ' || user?.role === 'SUPER_ADMIN';

  const { data: kpis, isLoading, error } = useQuery<KpiData>({
    queryKey: ['dashboard', 'kpis', mes, ano],
    queryFn: () => api.get(`/dashboard/kpis?mes=${mes}&ano=${ano}`).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const { data: comparativo, isLoading: loadingComp } = useQuery<FilialKpi[]>({
    queryKey: ['dashboard', 'comparativo', mes, ano],
    queryFn: () => api.get(`/dashboard/kpis/comparativo?mes=${mes}&ano=${ano}`).then((r) => r.data),
    enabled: isAdmin,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="mt-0.5 text-sm text-gray-400 dark:text-slate-500">
            Visão geral da filial — {MESES[mes]} {ano}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            className="input-base w-36 py-2 text-xs"
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
            max={2099}
            className="input-base w-24 py-2 text-xs"
          />
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-32" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-crimson-200 bg-crimson-50 p-4 text-sm text-crimson-600 dark:border-crimson-700/40 dark:bg-crimson-700/10 dark:text-crimson-300">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-5 w-5 shrink-0">
            <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" clipRule="evenodd" />
          </svg>
          Erro ao carregar dados. Verifique se você tem acesso à filial ativa.
        </div>
      )}

      {kpis && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard
              label="Alunos Ativos"
              value={kpis.alunos.ativo}
              sub="alunos matriculados"
              accent="text-forest-500 dark:text-forest-200"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.627 48.627 0 0 1 12 20.904a48.627 48.627 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.57 50.57 0 0 0-2.658-.813A59.905 59.905 0 0 1 12 3.493a59.902 59.902 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
                </svg>
              }
            />
            <StatCard
              label="Inadimplentes"
              value={kpis.inadimplentes}
              sub="pendentes de pagamento"
              accent={kpis.inadimplentes > 0 ? 'text-crimson-500 dark:text-crimson-300' : 'text-forest-500 dark:text-forest-200'}
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              }
            />
            <StatCard
              label="Receita do Mês"
              value={formatCurrency(kpis.receitaMes)}
              sub={`${MESES[kpis.mes]} ${kpis.ano}`}
              accent="text-brand-600 dark:text-brand-300"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                </svg>
              }
            />
            <StatCard
              label="Taxa de Ocupação"
              value={`${kpis.taxaOcupacao}%`}
              sub="capacidade utilizada"
              accent={
                kpis.taxaOcupacao >= 80
                  ? 'text-forest-500 dark:text-forest-200'
                  : kpis.taxaOcupacao >= 50
                  ? 'text-yellow-600 dark:text-yellow-300'
                  : 'text-crimson-500 dark:text-crimson-300'
              }
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125z" />
                </svg>
              }
              extra={<OccupancyBar value={kpis.taxaOcupacao} />}
            />
          </div>

          {/* Distribuição de alunos + Matrículas */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Distribuição */}
            <div className="card p-5 lg:col-span-2">
              <h2 className="mb-4 text-sm font-semibold text-gray-700 dark:text-slate-300">
                Distribuição de Alunos
              </h2>
              <div className="grid grid-cols-5 gap-2">
                <DistribuicaoItem label="Ativos" value={kpis.alunos.ativo} color="text-forest-500 dark:text-forest-300" />
                <DistribuicaoItem label="Pré-Matr." value={kpis.alunos.preMatricula} color="text-brand-600 dark:text-brand-300" />
                <DistribuicaoItem label="Espera" value={kpis.alunos.listaEspera} color="text-yellow-600 dark:text-yellow-300" />
                <DistribuicaoItem label="Inativos" value={kpis.alunos.inativo} color="text-gray-500 dark:text-slate-400" />
                <DistribuicaoItem label="Transfer." value={kpis.alunos.transferido} color="text-purple-600 dark:text-purple-300" />
              </div>
            </div>

            {/* Matrículas */}
            <div className="card flex flex-col justify-between p-5">
              <div>
                <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300">Matrículas Ativas</h2>
                <p className="mt-3 text-4xl font-bold text-brand-600 dark:text-brand-300">
                  {kpis.matriculasAtivas}
                </p>
                <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">contratos ativos</p>
              </div>
              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700">
                <div
                  className="h-full rounded-full bg-brand-600 transition-all"
                  style={{ width: `${Math.min((kpis.matriculasAtivas / Math.max(kpis.alunos.ativo, 1)) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* S031 — Comparativo entre filiais */}
      {isAdmin && (
        <div>
          <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-slate-100">
            Comparativo entre Filiais
          </h2>

          {loadingComp ? (
            <div className="skeleton h-48" />
          ) : comparativo && comparativo.length > 0 ? (
            <div className="table-container">
              <table className="table-base">
                <thead className="table-head">
                  <tr>
                    <th className="table-th">Filial</th>
                    <th className="table-th text-right">Alunos Ativos</th>
                    <th className="table-th text-right">Matrículas</th>
                    <th className="table-th text-right">Receita</th>
                    <th className="table-th text-right">Inadimpl.</th>
                    <th className="table-th text-right">Ocupação</th>
                  </tr>
                </thead>
                <tbody>
                  {comparativo.map((f) => (
                    <tr key={f.filialId} className="table-row">
                      <td className="table-td font-semibold text-gray-900 dark:text-slate-100">{f.filialNome}</td>
                      <td className="table-td text-right">{f.alunos.ativo}</td>
                      <td className="table-td text-right">{f.matriculasAtivas}</td>
                      <td className="table-td text-right font-medium text-forest-500 dark:text-forest-300">
                        {formatCurrency(f.receitaMes)}
                      </td>
                      <td className={`table-td text-right font-medium ${f.inadimplentes > 0 ? 'text-crimson-500 dark:text-crimson-300' : 'text-gray-400'}`}>
                        {f.inadimplentes}
                      </td>
                      <td className="table-td text-right">
                        <span className={`font-semibold ${f.taxaOcupacao >= 80 ? 'text-forest-500 dark:text-forest-300' : f.taxaOcupacao >= 50 ? 'text-yellow-600 dark:text-yellow-300' : 'text-crimson-500 dark:text-crimson-300'}`}>
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
