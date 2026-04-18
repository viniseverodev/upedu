// Listagem de alunos — S012

'use client';

import Link from 'next/link';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { usePermission } from '@/hooks/usePermission';
import { useToast } from '@/hooks/useToast';
import { Toast } from '@/components/ui/Toast';

// ---------- Helpers de calendário ----------

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DAY_NAMES = ['D','S','T','Q','Q','S','S'];

function pad2(n: number) { return String(n).padStart(2, '0'); }
function toDateStr(y: number, m: number, d: number) {
  return `${y}-${pad2(m + 1)}-${pad2(d)}`;
}
function fmtBR(s: string) {
  if (!s) return '—';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

interface Responsavel { id: string; nome: string; telefone: string | null }
interface AlunoResponsavel { responsavel: Responsavel; isResponsavelFinanceiro: boolean }
interface Aluno {
  id: string; nome: string; dataNascimento: string; createdAt: string;
  status: string; turno: string; responsaveis: AlunoResponsavel[];
}

const STATUS_LABELS: Record<string, string> = {
  PRE_MATRICULA: 'Pré-Matrícula', ATIVO: 'Ativo', INATIVO: 'Inativo',
  LISTA_ESPERA: 'Lista de Espera', TRANSFERIDO: 'Transferido',
};

const STATUS_BADGE: Record<string, string> = {
  PRE_MATRICULA: 'badge badge-blue', ATIVO: 'badge badge-green',
  INATIVO: 'badge badge-gray', LISTA_ESPERA: 'badge badge-yellow',
  TRANSFERIDO: 'badge badge-purple',
};

const STATUS_FILTERS = ['', 'PRE_MATRICULA', 'ATIVO', 'INATIVO', 'LISTA_ESPERA'];

// ---------- Ícones ----------

function IcoEye() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
    </svg>
  );
}

function IcoPencil() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
    </svg>
  );
}

function IcoTrash() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  );
}

function IcoSearch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607z" />
    </svg>
  );
}

// ---------- CalendarModal (seleção de intervalo de datas) ----------

interface CalendarModalProps {
  initialInicio: string;
  initialFim: string;
  onApply: (inicio: string, fim: string) => void;
  onClose: () => void;
}

function CalendarModal({ initialInicio, initialFim, onApply, onClose }: CalendarModalProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [start, setStart] = useState(initialInicio);
  const [end, setEnd] = useState(initialFim);
  const [hovered, setHovered] = useState('');

  function handleDayClick(d: string) {
    if (!start || (start && end)) {
      setStart(d);
      setEnd('');
    } else if (d < start) {
      setEnd(start);
      setStart(d);
    } else {
      setEnd(d);
    }
  }

  function inRange(d: string) {
    const e = end || hovered;
    if (!start || !e) return false;
    const [lo, hi] = start <= e ? [start, e] : [e, start];
    return d > lo && d < hi;
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const canApply = !!(start && end);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-80 rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Título */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">Período de cadastro</p>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navegação de mês */}
        <div className="mb-3 flex items-center justify-between">
          <button
            onClick={prevMonth}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
          <span className="text-sm font-medium text-gray-800 dark:text-slate-200">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <button
            onClick={nextMonth}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>

        {/* Grid do calendário */}
        <div className="grid grid-cols-7 text-center text-xs">
          {DAY_NAMES.map((d, i) => (
            <div key={i} className="py-1.5 font-semibold text-gray-400 dark:text-slate-500">{d}</div>
          ))}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const d = toDateStr(viewYear, viewMonth, day);
            const isStart = d === start;
            const isEnd = d === end;
            const isSelected = isStart || isEnd;
            const ranged = inRange(d);

            return (
              <button
                key={day}
                onClick={() => handleDayClick(d)}
                onMouseEnter={() => !end && setHovered(d)}
                onMouseLeave={() => setHovered('')}
                className={[
                  'relative py-1.5 text-xs font-medium transition-colors',
                  isSelected
                    ? 'z-10 rounded-full bg-brand-600 text-white'
                    : ranged
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                      : 'rounded-full text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700',
                ].join(' ')}
              >
                {day}
              </button>
            );
          })}
        </div>

        {/* Resumo */}
        <div className="mt-4 flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 text-xs dark:bg-slate-800">
          <span className="text-gray-500 dark:text-slate-400">
            De <strong className="text-gray-800 dark:text-slate-100">{fmtBR(start)}</strong>
          </span>
          <span className="text-gray-300 dark:text-slate-600">→</span>
          <span className="text-gray-500 dark:text-slate-400">
            Até <strong className="text-gray-800 dark:text-slate-100">{fmtBR(end)}</strong>
          </span>
        </div>

        {/* Ações */}
        <div className="mt-3 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Cancelar
          </button>
          <button
            onClick={() => canApply && onApply(start, end)}
            disabled={!canApply}
            className="flex-1 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Modal de confirmação de exclusão ----------

function DeleteModal({
  aluno,
  onConfirm,
  onCancel,
  loading,
}: {
  aluno: Aluno;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-crimson-50 text-crimson-500 dark:bg-crimson-900/30 dark:text-crimson-400">
          <IcoTrash />
        </div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
          Remover aluno
        </h2>
        <p className="mt-1.5 text-sm text-gray-500 dark:text-slate-400">
          Tem certeza que deseja remover{' '}
          <strong className="text-gray-800 dark:text-slate-200">{aluno.nome}</strong>?
          Esta ação não pode ser desfeita.
        </p>
        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-xl bg-crimson-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-crimson-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Removendo…' : 'Remover'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Page ----------

export default function AlunosPage() {
  const queryClient = useQueryClient();
  const canManage = usePermission('GERENTE_FILIAL');
  const router = useRouter();
  const searchParams = useSearchParams();

  const { toast, showToast, hideToast } = useToast();
  const didReadParam = useRef(false);

  // Lê parâmetros de URL vindos de outras páginas (?created=, ?updated=, ?respErr=)
  // showToast é omitida das deps intencionalmente: captura apenas refs estáveis (setToast, toastTimerRef).
  // didReadParam evita que o router.replace re-dispare o effect com searchParams vazio.
  useEffect(() => {
    if (didReadParam.current) return;
    if (!searchParams) return;
    const created  = searchParams.get('created');
    const updated  = searchParams.get('updated');
    const respErr  = searchParams.get('respErr');
    if (!created && !updated) return;
    didReadParam.current = true;
    router.replace('/alunos');
    if (created && respErr === '1') {
      showToast(
        'Aluno cadastrado (atenção)',
        `${decodeURIComponent(created)} foi adicionado, mas o responsável não pôde ser salvo. Adicione-o pelo perfil do aluno.`,
      );
    } else if (created) {
      showToast('Aluno cadastrado', `${decodeURIComponent(created)} foi adicionado com sucesso.`);
    } else if (updated) {
      showToast('Aluno atualizado', `${decodeURIComponent(updated)} foi atualizado com sucesso.`);
    }
  }, [searchParams, showToast]);

  // Filtros
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [turnoFilter, setTurnoFilter] = useState('');
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFim, setPeriodoFim] = useState('');

  // Calendário período de cadastro
  const [showPeriodoModal, setShowPeriodoModal] = useState(false);

  // Exclusão
  const [alunoParaDeletar, setAlunoParaDeletar] = useState<Aluno | null>(null);

  const { data: alunos = [], isLoading } = useQuery<Aluno[]>({
    queryKey: ['alunos'],
    queryFn: () => api.get('/alunos').then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/alunos/${id}`),
    onSuccess: () => {
      const nome = alunoParaDeletar?.nome ?? 'Aluno';
      queryClient.invalidateQueries({ queryKey: ['alunos'] });
      setAlunoParaDeletar(null);
      showToast('Aluno removido', `${nome} foi removido com sucesso.`);
    },
  });

  // Filtragem client-side
  const alunosFiltrados = useMemo(() => {
    return alunos.filter((a) => {
      if (statusFilter && a.status !== statusFilter) return false;
      if (turnoFilter && a.turno !== turnoFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const nomeMatch = a.nome.toLowerCase().includes(q);
        const respMatch = a.responsaveis.some((r) =>
          r.responsavel.nome.toLowerCase().includes(q)
        );
        if (!nomeMatch && !respMatch) return false;
      }
      if (periodoInicio && a.createdAt.slice(0, 10) < periodoInicio) return false;
      if (periodoFim && a.createdAt.slice(0, 10) > periodoFim) return false;
      return true;
    });
  }, [alunos, search, statusFilter, turnoFilter, periodoInicio, periodoFim]);

  const hasActiveFilters = search || statusFilter || turnoFilter || periodoInicio || periodoFim;

  function clearFilters() {
    setSearch('');
    setStatusFilter('');
    setTurnoFilter('');
    setPeriodoInicio('');
    setPeriodoFim('');
  }

  return (
    <div className="space-y-5 p-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Alunos</h1>
          <p className="mt-0.5 text-sm text-gray-400 dark:text-slate-500">
            {isLoading
              ? '…'
              : `${alunosFiltrados.length} de ${alunos.length} aluno${alunos.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {canManage && (
          <Link href="/alunos/novo" className="btn-primary">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5z" />
            </svg>
            Novo Aluno
          </Link>
        )}
      </div>

      {/* Barra de filtros */}
      <div className="card p-4">
        <div className="flex flex-wrap items-end gap-3">
          {/* Busca por nome / responsável */}
          <div className="flex min-w-48 flex-1 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
            <span className="shrink-0 text-gray-400"><IcoSearch /></span>
            <input
              type="text"
              placeholder="Buscar por nome ou responsável…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder-gray-400 dark:text-slate-100 dark:placeholder-slate-500"
            />
          </div>

          {/* Turno */}
          <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-0.5 text-xs dark:border-slate-700 dark:bg-slate-800">
            {[['', 'Todos'], ['MANHA', 'Manhã'], ['TARDE', 'Tarde']].map(([v, l]) => (
              <button
                key={v}
                onClick={() => setTurnoFilter(v)}
                className={`rounded-lg px-3 py-1.5 font-medium transition-all ${
                  turnoFilter === v
                    ? 'bg-white text-gray-900 shadow-sm dark:bg-slate-700 dark:text-slate-100'
                    : 'text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300'
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Período de cadastro — abre CalendarModal */}
          <button
            onClick={() => setShowPeriodoModal(true)}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
              periodoInicio || periodoFim
                ? 'border-brand-400 bg-brand-50 text-brand-700 dark:border-brand-600 dark:bg-brand-900/20 dark:text-brand-300'
                : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-3.5 w-3.5 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
            {periodoInicio && periodoFim
              ? `${fmtBR(periodoInicio)} → ${fmtBR(periodoFim)}`
              : periodoInicio
                ? `A partir de ${fmtBR(periodoInicio)}`
                : 'Período'}
          </button>

          {/* Limpar filtros */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-700 dark:border-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Limpar
            </button>
          )}
        </div>

        {/* Chips de status */}
        <div className="mt-3 flex flex-wrap gap-2">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full border px-3.5 py-1 text-xs font-semibold transition-all ${
                statusFilter === s
                  ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-brand-500 dark:hover:text-brand-400'
              }`}
            >
              {s === '' ? 'Todos os status' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
        </div>
      ) : alunosFiltrados.length === 0 ? (
        <div className="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="mx-auto mb-3 h-12 w-12 text-gray-300 dark:text-slate-700">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.627 48.627 0 0 1 12 20.904a48.627 48.627 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.57 50.57 0 0 0-2.658-.813A59.905 59.905 0 0 1 12 3.493a59.902 59.902 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />
          </svg>
          <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Nenhum aluno encontrado</p>
          <p className="mt-1 text-xs text-gray-400 dark:text-slate-600">
            {hasActiveFilters ? 'Tente ajustar os filtros.' : 'Cadastre um novo aluno para começar.'}
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table-base">
            <thead className="table-head">
              <tr>
                <th className="table-th">Nome</th>
                <th className="table-th">Nascimento</th>
                <th className="table-th">Turno</th>
                <th className="table-th">Responsável</th>
                <th className="table-th">Status</th>
                <th className="table-th w-28 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {alunosFiltrados.map((aluno) => (
                <tr key={aluno.id} className="table-row">
                  <td className="table-td font-semibold text-gray-900 dark:text-slate-100">
                    {aluno.nome}
                  </td>
                  <td className="table-td tabular-nums text-gray-600 dark:text-slate-400">
                    {formatDate(aluno.dataNascimento)}
                  </td>
                  <td className="table-td">
                    <span className={`badge ${aluno.turno === 'MANHA' ? 'badge-blue' : 'badge-gray'}`}>
                      {aluno.turno === 'MANHA' ? 'Manhã' : 'Tarde'}
                    </span>
                  </td>
                  <td className="table-td text-gray-600 dark:text-slate-400">
                    {(aluno.responsaveis.find((ar) => ar.isResponsavelFinanceiro) ?? aluno.responsaveis[0])?.responsavel.nome ?? '—'}
                  </td>
                  <td className="table-td">
                    <span className={STATUS_BADGE[aluno.status] ?? 'badge badge-gray'}>
                      {STATUS_LABELS[aluno.status] ?? aluno.status}
                    </span>
                  </td>
                  <td className="table-td">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/alunos/${aluno.id}`}
                        title="Visualizar"
                        className="rounded-lg p-1.5 text-brand-400 transition-colors hover:bg-brand-50 hover:text-brand-600 dark:text-brand-500 dark:hover:bg-brand-900/20 dark:hover:text-brand-400"
                      >
                        <IcoEye />
                      </Link>
                      {canManage && (
                        <Link
                          href={`/alunos/${aluno.id}/editar`}
                          title="Editar"
                          className="rounded-lg p-1.5 text-amber-400 transition-colors hover:bg-amber-50 hover:text-amber-600 dark:text-amber-500 dark:hover:bg-amber-900/20 dark:hover:text-amber-400"
                        >
                          <IcoPencil />
                        </Link>
                      )}
                      {canManage && (
                        <button
                          onClick={() => setAlunoParaDeletar(aluno)}
                          title="Remover"
                          className="rounded-lg p-1.5 text-crimson-400 transition-colors hover:bg-crimson-50 hover:text-crimson-600 dark:text-crimson-500 dark:hover:bg-crimson-900/20 dark:hover:text-crimson-400"
                        >
                          <IcoTrash />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CalendarModal — filtro de período de cadastro */}
      {showPeriodoModal && (
        <CalendarModal
          initialInicio={periodoInicio}
          initialFim={periodoFim}
          onApply={(ini, fim) => {
            setPeriodoInicio(ini);
            setPeriodoFim(fim);
            setShowPeriodoModal(false);
          }}
          onClose={() => setShowPeriodoModal(false)}
        />
      )}

      {/* Modal de confirmação de exclusão */}
      {alunoParaDeletar && (
        <DeleteModal
          aluno={alunoParaDeletar}
          loading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(alunoParaDeletar.id)}
          onCancel={() => setAlunoParaDeletar(null)}
        />
      )}

      <Toast toast={toast} onClose={hideToast} />
    </div>
  );
}
