// Dashboard KPIs — S030
// Cards com TanStack Query + Redis cache (TTL 5min no backend)

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

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

  const { data: kpis, isLoading, error } = useQuery<KpiData>({
    queryKey: ['dashboard', 'kpis', mes, ano],
    queryFn: () => api.get(`/dashboard/kpis?mes=${mes}&ano=${ano}`).then((r) => r.data),
    staleTime: 5 * 60 * 1000, // 5min — espelha TTL do cache Redis
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
