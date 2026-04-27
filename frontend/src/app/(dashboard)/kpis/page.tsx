// Dashboard KPIs — S030 + S031 (refatorado)

'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { formatCurrency } from '@/lib/utils';
import { CalendarRangePicker, fmtBR } from '@/components/ui/CalendarRangePicker';

// ---------- Tipos ----------

interface AlunosPorTurno {
  manha: number;
  tarde: number;
}

interface KpiFilial {
  filialId: string;
  filialNome: string;
  alunos: { ativo: number; inativo: number; listaEspera: number; preMatricula: number; transferido: number };
  alunosPorTurno: AlunosPorTurno;
  matriculasAtivas: number;
  receitaPeriodo: number;
  inadimplentes: number;
  taxaOcupacao: number;
  transacoes: { entradas: number; saidas: number };
  periodo: { inicio: string; fim: string };
}

// ---------- Filtro de período ----------

type PeriodoPreset = 'hoje' | 'semana' | 'mes' | 'personalizado';

function resolvePreset(preset: PeriodoPreset, mes: number, ano: number): { dataInicio: string; dataFim: string } {
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const hoje = new Date();
  if (preset === 'hoje') {
    const s = fmt(hoje);
    return { dataInicio: s, dataFim: s };
  }
  if (preset === 'semana') {
    const dom = new Date(hoje);
    dom.setDate(hoje.getDate() - hoje.getDay());
    const sab = new Date(dom);
    sab.setDate(dom.getDate() + 6);
    return { dataInicio: fmt(dom), dataFim: fmt(sab) };
  }
  if (preset === 'mes') {
    const ultimo = new Date(ano, mes, 0).getDate();
    return { dataInicio: `${ano}-${pad(mes)}-01`, dataFim: `${ano}-${pad(mes)}-${pad(ultimo)}` };
  }
  return { dataInicio: '', dataFim: '' };
}

// ---------- Componentes de UI ----------

function StatCard({
  label,
  value,
  sub,
  icon,
  accentBg,
  accentText,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accentBg: string;
  accentText: string;
}) {
  return (
    <div className="card flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accentBg}`}>
          {icon}
        </div>
      </div>
      <div>
        <p className={`text-3xl font-bold ${accentText}`}>{value}</p>
        <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-slate-500">{label}</p>
        {sub && <p className="mt-0.5 text-xs text-stone-400 dark:text-slate-500">{sub}</p>}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return <div className="skeleton h-32 rounded-2xl" />;
}

// ---------- Icons ----------

function IcoStudents() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.627 48.627 0 0 1 12 20.904a48.627 48.627 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.57 50.57 0 0 0-2.658-.813A59.905 59.905 0 0 1 12 3.493a59.902 59.902 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />
    </svg>
  );
}

function IcoClock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
    </svg>
  );
}

function IcoMoon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998z" />
    </svg>
  );
}

function IcoCurrency() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
    </svg>
  );
}

function IcoQueue() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75z" />
    </svg>
  );
}

function IcoArrowUp() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
    </svg>
  );
}

function IcoArrowDown() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6 9 12.75l4.306-4.306a11.95 11.95 0 0 1 5.814 5.518l2.74 1.22m0 0-5.94 2.281m5.94-2.28-2.28-5.941" />
    </svg>
  );
}

// ---------- Estilos compartilhados (sem w-full / block) ----------

const filterInput = [
  'rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-900',
  'shadow-sm outline-none transition-all',
  'focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
  'dark:border-slate-700 dark:bg-white/[0.06] dark:text-slate-100 dark:focus:border-brand-500',
].join(' ');

// ---------- FilterBar ----------

type FilterBarProps = {
  preset: PeriodoPreset;
  setPreset: (p: PeriodoPreset) => void;
  customInicio: string;
  setCustomInicio: (v: string) => void;
  customFim: string;
  setCustomFim: (v: string) => void;
  isAdmin: boolean;
  comparativo: KpiFilial[] | undefined;
  filialSelecionada: string;
  setFilialSelecionada: (v: string) => void;
};

function FilterBar({
  preset, setPreset,
  customInicio, setCustomInicio, customFim, setCustomFim,
  isAdmin, comparativo, filialSelecionada, setFilialSelecionada,
}: FilterBarProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);

  function handleApplyPeriodo(inicio: string, fim: string) {
    setCustomInicio(inicio);
    setCustomFim(fim);
    setPreset('personalizado');
    setCalendarOpen(false);
  }

  const periodoLabel = customInicio && customFim
    ? `${fmtBR(customInicio)} → ${fmtBR(customFim)}`
    : 'Período';

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {/* Seletor de filial — inline com os demais filtros */}
        {isAdmin && comparativo && comparativo.length > 0 && (
          <select
            value={filialSelecionada}
            onChange={(e) => setFilialSelecionada(e.target.value)}
            className={filterInput}
          >
            <option value="todas">Todas as filiais</option>
            {comparativo.map((f) => (
              <option key={f.filialId} value={f.filialId}>{f.filialNome}</option>
            ))}
          </select>
        )}

        {/* Grupo de presets de período */}
        <div className="flex rounded-xl border border-stone-200 bg-stone-50 p-0.5 text-xs dark:border-slate-700 dark:bg-white/[0.06]">
          {(['hoje', 'semana', 'mes'] as PeriodoPreset[]).map((p) => (
            <button
              key={p}
              onClick={() => setPreset(p)}
              className={`rounded-lg px-3 py-1.5 font-medium transition-all ${
                preset === p
                  ? 'bg-white text-stone-900 shadow-sm dark:bg-slate-700 dark:text-slate-100'
                  : 'text-stone-400 hover:text-stone-600 dark:text-slate-500 dark:hover:text-slate-300'
              }`}
            >
              {p === 'hoje' ? 'Hoje' : p === 'semana' ? 'Semana' : 'Mês'}
            </button>
          ))}

          {/* Botão Período — abre CalendarModal */}
          <div className="flex items-center">
            <button
              onClick={() => setCalendarOpen(true)}
              className={`rounded-lg px-3 py-1.5 font-medium transition-all ${
                preset === 'personalizado'
                  ? 'bg-white text-stone-900 shadow-sm dark:bg-slate-700 dark:text-slate-100'
                  : 'text-stone-400 hover:text-stone-600 dark:text-slate-500 dark:hover:text-slate-300'
              }`}
            >
              {preset === 'personalizado' && customInicio && customFim ? periodoLabel : 'Período'}
            </button>
            {preset === 'personalizado' && (
              <button
                onClick={() => { setPreset('semana'); setCustomInicio(''); setCustomFim(''); }}
                title="Limpar período"
                className="ml-1 rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-white/[0.1] dark:hover:text-slate-200"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Modal de calendário — renderizado fora do flex para não ser cortado */}
      {calendarOpen && (
        <CalendarRangePicker
          title="Selecionar período"
          initialInicio={customInicio}
          initialFim={customFim}
          onApply={handleApplyPeriodo}
          onClose={() => setCalendarOpen(false)}
          showShortcuts={false}
        />
      )}
    </>
  );
}

// ---------- Custom Tooltip ----------

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  currency?: boolean;
}

function CustomTooltip({ active, payload, label, currency = false }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 shadow-lg dark:border-slate-700 dark:bg-white/[0.06]">
      {label && (
        <p className="mb-1.5 text-xs font-semibold text-stone-500 dark:text-slate-400">{label}</p>
      )}
      <div className="space-y-1">
        {payload.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-xs text-stone-600 dark:text-slate-300">{item.name}</span>
            <span className="ml-auto pl-4 text-xs font-semibold text-stone-900 dark:text-slate-100">
              {currency ? formatCurrency(item.value) : item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Page ----------

export default function KpisPage() {
  const now = new Date();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN_MATRIZ' || user?.role === 'SUPER_ADMIN';

  // Filtro de período
  const [preset, setPreset] = useState<PeriodoPreset>('mes');
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [customInicio, setCustomInicio] = useState('');
  const [customFim, setCustomFim] = useState('');

  // Filtro de filial (admin)
  const [filialSelecionada, setFilialSelecionada] = useState<string>('todas');

  const { dataInicio, dataFim } = useMemo(() => {
    if (preset === 'personalizado') return { dataInicio: customInicio, dataFim: customFim };
    return resolvePreset(preset, mes, ano);
  }, [preset, mes, ano, customInicio, customFim]);

  const queryParams = dataInicio && dataFim
    ? `dataInicio=${dataInicio}&dataFim=${dataFim}`
    : '';

  // Admin: busca comparativo (todas as filiais)
  const { data: comparativo, isLoading: loadingComp } = useQuery<KpiFilial[]>({
    queryKey: ['dashboard', 'comparativo', queryParams],
    queryFn: () =>
      api.get(`/dashboard/kpis/comparativo?${queryParams}`).then((r) => r.data),
    enabled: isAdmin && !!queryParams,
    staleTime: 5 * 60 * 1000,
  });

  // Non-admin: busca kpis da filial via header
  const { data: kpisFilial, isLoading: loadingFilial } = useQuery<KpiFilial>({
    queryKey: ['dashboard', 'kpis', queryParams],
    queryFn: () =>
      api.get(`/dashboard/kpis?${queryParams}`).then((r) => r.data),
    enabled: !isAdmin && !!queryParams,
    staleTime: 5 * 60 * 1000,
  });

  // Dados consolidados conforme seleção
  const dados: KpiFilial | null = useMemo(() => {
    if (!isAdmin) return kpisFilial ?? null;

    if (!comparativo || comparativo.length === 0) return null;

    if (filialSelecionada !== 'todas') {
      return comparativo.find((f) => f.filialId === filialSelecionada) ?? null;
    }

    // Agregar todas as filiais
    return comparativo.reduce<KpiFilial>(
      (acc, f) => ({
        filialId: 'todas',
        filialNome: 'Todas as filiais',
        alunos: {
          ativo: acc.alunos.ativo + f.alunos.ativo,
          inativo: acc.alunos.inativo + f.alunos.inativo,
          listaEspera: acc.alunos.listaEspera + f.alunos.listaEspera,
          preMatricula: acc.alunos.preMatricula + f.alunos.preMatricula,
          transferido: acc.alunos.transferido + f.alunos.transferido,
        },
        alunosPorTurno: {
          manha: acc.alunosPorTurno.manha + f.alunosPorTurno.manha,
          tarde: acc.alunosPorTurno.tarde + f.alunosPorTurno.tarde,
        },
        matriculasAtivas: acc.matriculasAtivas + f.matriculasAtivas,
        receitaPeriodo: acc.receitaPeriodo + f.receitaPeriodo,
        inadimplentes: acc.inadimplentes + f.inadimplentes,
        taxaOcupacao: 0,
        transacoes: {
          entradas: acc.transacoes.entradas + f.transacoes.entradas,
          saidas: acc.transacoes.saidas + f.transacoes.saidas,
        },
        periodo: f.periodo,
      }),
      {
        filialId: 'todas',
        filialNome: 'Todas as filiais',
        alunos: { ativo: 0, inativo: 0, listaEspera: 0, preMatricula: 0, transferido: 0 },
        alunosPorTurno: { manha: 0, tarde: 0 },
        matriculasAtivas: 0,
        receitaPeriodo: 0,
        inadimplentes: 0,
        taxaOcupacao: 0,
        transacoes: { entradas: 0, saidas: 0 },
        periodo: comparativo[0]?.periodo ?? { inicio: '', fim: '' },
      }
    );
  }, [isAdmin, kpisFilial, comparativo, filialSelecionada]);

  // Evolução mensal — filial única ou não-admin
  const filialEvolucaoId = useMemo(() => {
    if (!isAdmin) return 'me'; // será ignorado, o header já define a filial
    if (filialSelecionada !== 'todas') return filialSelecionada;
    return null;
  }, [isAdmin, filialSelecionada]);

  const { data: evolucao } = useQuery<{ mes: string; alunosAtivos: number; receita: number }[]>({
    queryKey: ['dashboard', 'evolucao', filialEvolucaoId],
    queryFn: () => api.get('/dashboard/evolucao?meses=6').then((r) => r.data),
    // Busca quando: não-admin (sempre) OU admin com filial específica selecionada
    enabled: !isAdmin || filialSelecionada !== 'todas',
    staleTime: 5 * 60 * 1000,
  });

  // Dados para os gráficos de comparativo
  const chartDataAlunos = useMemo(() => {
    if (!comparativo) return [];
    return comparativo.map((f) => ({
      name: f.filialNome,
      Manhã: f.alunosPorTurno.manha,
      Tarde: f.alunosPorTurno.tarde,
      Espera: f.alunos.listaEspera,
    }));
  }, [comparativo]);

  const chartDataReceita = useMemo(() => {
    if (!comparativo) return [];
    return comparativo.map((f) => ({
      name: f.filialNome,
      Receita: f.receitaPeriodo,
    }));
  }, [comparativo]);

  const chartDataTransacoes = useMemo(() => {
    if (!comparativo) return [];
    return comparativo.map((f) => ({
      name: f.filialNome,
      Entradas: f.transacoes.entradas,
      Saídas: f.transacoes.saidas,
    }));
  }, [comparativo]);

  const isLoading = isAdmin ? loadingComp : loadingFilial;

  const MESES = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  const periodoLabel = dataInicio && dataFim
    ? dataInicio === dataFim
      ? dataInicio
      : `${dataInicio} → ${dataFim}`
    : '—';

  return (
    <div className="space-y-6 p-6">
      {/* Header + Barra de filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="mt-0.5 text-sm text-stone-400 dark:text-slate-500">{periodoLabel}</p>
        </div>

        <FilterBar
          preset={preset}
          setPreset={setPreset}
          customInicio={customInicio}
          setCustomInicio={setCustomInicio}
          customFim={customFim}
          setCustomFim={setCustomFim}
          isAdmin={isAdmin}
          comparativo={comparativo}
          filialSelecionada={filialSelecionada}
          setFilialSelecionada={setFilialSelecionada}
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* KPI Cards */}
      {dados && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <StatCard
            label="Fila de espera"
            value={dados.alunos.listaEspera}
            sub="aguardando vaga"
            accentBg="bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-300"
            accentText="text-yellow-600 dark:text-yellow-300"
            icon={<IcoQueue />}
          />
          <StatCard
            label="Turno Manhã"
            value={dados.alunosPorTurno.manha}
            sub="alunos ativos"
            accentBg="bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-300"
            accentText="text-brand-600 dark:text-brand-300"
            icon={<IcoClock />}
          />
          <StatCard
            label="Turno Tarde"
            value={dados.alunosPorTurno.tarde}
            sub="alunos ativos"
            accentBg="bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-300"
            accentText="text-purple-600 dark:text-purple-300"
            icon={<IcoMoon />}
          />
          <StatCard
            label="Alunos ativos"
            value={dados.alunos.ativo}
            sub="total geral"
            accentBg="bg-forest-50 text-forest-500 dark:bg-forest-700/20 dark:text-forest-200"
            accentText="text-forest-500 dark:text-forest-200"
            icon={<IcoStudents />}
          />
          <StatCard
            label="Receita do período"
            value={formatCurrency(dados.receitaPeriodo)}
            sub={periodoLabel}
            accentBg="bg-forest-50 text-forest-500 dark:bg-forest-700/20 dark:text-forest-200"
            accentText="text-forest-500 dark:text-forest-200"
            icon={<IcoCurrency />}
          />
        </div>
      )}

      {/* KPIs de transações financeiras */}
      {dados && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Entradas"
            value={formatCurrency(dados.transacoes.entradas)}
            sub={periodoLabel}
            accentBg="bg-forest-50 text-forest-500 dark:bg-forest-700/20 dark:text-forest-200"
            accentText="text-forest-500 dark:text-forest-200"
            icon={<IcoArrowUp />}
          />
          <StatCard
            label="Saídas"
            value={formatCurrency(dados.transacoes.saidas)}
            sub={periodoLabel}
            accentBg="bg-crimson-50 text-crimson-500 dark:bg-crimson-700/20 dark:text-crimson-300"
            accentText="text-crimson-500 dark:text-crimson-300"
            icon={<IcoArrowDown />}
          />
          <StatCard
            label="Saldo"
            value={formatCurrency(dados.transacoes.entradas - dados.transacoes.saidas)}
            sub={periodoLabel}
            accentBg={
              dados.transacoes.entradas >= dados.transacoes.saidas
                ? 'bg-forest-50 text-forest-500 dark:bg-forest-700/20 dark:text-forest-200'
                : 'bg-crimson-50 text-crimson-500 dark:bg-crimson-700/20 dark:text-crimson-300'
            }
            accentText={
              dados.transacoes.entradas >= dados.transacoes.saidas
                ? 'text-forest-500 dark:text-forest-200'
                : 'text-crimson-500 dark:text-crimson-300'
            }
            icon={<IcoCurrency />}
          />
        </div>
      )}

      {/* Gráfico de evolução — filial única ou não-admin */}
      {evolucao && evolucao.length > 0 && (!isAdmin || filialSelecionada !== 'todas') && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Alunos ativos ao longo do tempo */}
          <div className="card p-5">
            <h2 className="mb-4 text-sm font-semibold text-stone-900 dark:text-slate-100">
              Evolução de alunos ativos
            </h2>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={evolucao} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradAlunos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-stone-200 dark:text-slate-700" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '4 2' }} />
                <Area
                  type="monotone"
                  dataKey="alunosAtivos"
                  name="Alunos ativos"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#gradAlunos)"
                  dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#3b82f6', strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Receita ao longo do tempo */}
          <div className="card p-5">
            <h2 className="mb-4 text-sm font-semibold text-stone-900 dark:text-slate-100">
              Evolução de receita
            </h2>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={evolucao} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-stone-200 dark:text-slate-700" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip currency />} cursor={{ stroke: '#22c55e', strokeWidth: 1, strokeDasharray: '4 2' }} />
                <Area
                  type="monotone"
                  dataKey="receita"
                  name="Receita"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fill="url(#gradReceita)"
                  dot={{ r: 3, fill: '#22c55e', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#22c55e', strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Comparativo por filial em gráficos (admin, mais de uma filial, sem filtro) */}
      {isAdmin && comparativo && comparativo.length > 1 && filialSelecionada === 'todas' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {/* Gráfico: Alunos por turno */}
          <div className="card p-5">
            <h2 className="mb-4 text-sm font-semibold text-stone-900 dark:text-slate-100">
              Alunos por turno e fila de espera
            </h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartDataAlunos} margin={{ top: 0, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-stone-200 dark:text-slate-700" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'currentColor', className: 'text-stone-100/60 dark:text-slate-700/60' }} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar dataKey="Manhã" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="Tarde" fill="#a855f7" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="Espera" fill="#eab308" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico: Receita por filial */}
          <div className="card p-5">
            <h2 className="mb-4 text-sm font-semibold text-stone-900 dark:text-slate-100">
              Receita por filial
            </h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartDataReceita} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-stone-200 dark:text-slate-700" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip currency />} cursor={{ fill: 'currentColor', className: 'text-stone-100/60 dark:text-slate-700/60' }} />
                <Bar dataKey="Receita" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico: Entradas e saídas por filial */}
          <div className="card p-5 lg:col-span-2 xl:col-span-1">
            <h2 className="mb-4 text-sm font-semibold text-stone-900 dark:text-slate-100">
              Entradas e saídas por filial
            </h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartDataTransacoes} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-stone-200 dark:text-slate-700" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip currency />} cursor={{ fill: 'currentColor', className: 'text-stone-100/60 dark:text-slate-700/60' }} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar dataKey="Entradas" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
