// Listagem de alunos — S012

'use client';

import Link from 'next/link';
import { useState, useMemo, useEffect, useRef, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { usePermission } from '@/hooks/usePermission';
import { useToast } from '@/hooks/useToast';
import { Toast } from '@/components/ui/Toast';
import { AxiosError } from 'axios';
import { CalendarRangePicker, fmtBR } from '@/components/ui/CalendarRangePicker';

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

function IcoBanknote() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
    </svg>
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
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl dark:border-slate-700/60 dark:bg-[#0c0e14]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-crimson-50 text-crimson-500 dark:bg-crimson-900/30 dark:text-crimson-400">
          <IcoTrash />
        </div>
        <h2 className="text-base font-semibold text-stone-900 dark:text-slate-100">
          Remover aluno
        </h2>
        <p className="mt-1.5 text-sm text-stone-500 dark:text-slate-400">
          Tem certeza que deseja remover{' '}
          <strong className="text-stone-800 dark:text-slate-200">{aluno.nome}</strong>?
          Esta ação não pode ser desfeita.
        </p>
        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-600 transition-colors hover:bg-stone-50 disabled:opacity-40 dark:border-slate-700 dark:bg-white/[0.06] dark:text-slate-300 dark:hover:bg-white/[0.1]"
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
    </div>,
    document.body,
  );
}

// ---------- Page ----------

function AlunosContent() {
  const queryClient = useQueryClient();
  const canManage = usePermission('GERENTE_FILIAL');
  const canAtendente = usePermission('ATENDENTE');
  const now = new Date();
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
  }, [searchParams, showToast, router]);

  // Filtros
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [turnoFilter, setTurnoFilter] = useState('');
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFim, setPeriodoFim] = useState('');
  const [sortAz, setSortAz] = useState<'asc' | 'desc' | null>('asc');

  // Filtro popover
  const filterRef = useRef<HTMLDivElement>(null);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Rascunho do filtro — só commita ao clicar "Aplicar"
  const [draftTurno, setDraftTurno] = useState('');
  const [draftSortAz, setDraftSortAz] = useState<'asc' | 'desc' | null>('asc');
  const [draftPeriodoInicio, setDraftPeriodoInicio] = useState('');
  const [draftPeriodoFim, setDraftPeriodoFim] = useState('');

  // Settings (colunas)
  const settingsRef = useRef<HTMLDivElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    () => new Set(['cadastro', 'nome', 'nascimento', 'turno', 'responsavel', 'status']),
  );
  const ALL_COLUMNS = [
    { key: 'cadastro',    label: 'Cadastro' },
    { key: 'nome',        label: 'Nome' },
    { key: 'nascimento',  label: 'Nascimento' },
    { key: 'turno',       label: 'Turno' },
    { key: 'responsavel', label: 'Responsável' },
    { key: 'status',      label: 'Status' },
  ] as const;
  function toggleColumn(key: string) {
    setVisibleColumns((prev) => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next; });
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterPanelOpen(false);
        setShowDatePicker(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) setSettingsOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Exclusão
  const [alunoParaDeletar, setAlunoParaDeletar] = useState<Aluno | null>(null);

  // Gerar mensalidade rápida
  const [modalGerarMensalidade, setModalGerarMensalidade] = useState<Aluno | null>(null);
  const [gerarMes, setGerarMes] = useState(now.getMonth() + 1);
  const [gerarAno, setGerarAno] = useState(now.getFullYear());
  const [mensalidadeError, setMensalidadeError] = useState<string | null>(null);

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
    onError: (err: AxiosError<{ message: string }>) => {
      showToast(
        'Erro ao remover',
        err.response?.data?.message ?? 'Não foi possível remover o aluno. Tente novamente.',
      );
    },
  });

  const mutGerarMensalidade = useMutation({
    mutationFn: (data: { alunoId: string; mesReferencia: number; anoReferencia: number }) =>
      api.post('/mensalidades', data),
    onSuccess: () => {
      setModalGerarMensalidade(null);
      setMensalidadeError(null);
      router.push('/financeiro/mensalidades');
    },
    onError: (err: AxiosError<{ message: string }>) => {
      setMensalidadeError(err.response?.data?.message ?? 'Erro ao gerar mensalidade.');
    },
  });

  // Filtragem client-side
  const alunosFiltrados = useMemo(() => {
    const filtered = alunos.filter((a) => {
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
    if (sortAz) {
      filtered.sort((a, b) =>
        sortAz === 'asc'
          ? a.nome.localeCompare(b.nome, 'pt-BR')
          : b.nome.localeCompare(a.nome, 'pt-BR')
      );
    }
    return filtered;
  }, [alunos, search, statusFilter, turnoFilter, periodoInicio, periodoFim, sortAz]);

  const hasActiveFilters = search || statusFilter || turnoFilter || periodoInicio || periodoFim;

  return (
    <div className="space-y-5 p-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Alunos</h1>
          <p className="mt-0.5 text-sm text-stone-400 dark:text-slate-500">
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
      <div className="card p-4 space-y-3">

        {/* Linha 1: Filtro (esq) + Busca (dir) */}
        <div className="flex items-center gap-2">

          {/* Filtro — popover */}
          <div ref={filterRef} className="relative">
            <button
              onClick={() => {
                setDraftTurno(turnoFilter);
                setDraftSortAz(sortAz);
                setDraftPeriodoInicio(periodoInicio);
                setDraftPeriodoFim(periodoFim);
                setShowDatePicker(false);
                setFilterPanelOpen((v) => !v);
              }}
              className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-all ${
                filterPanelOpen || turnoFilter || periodoInicio || periodoFim
                  ? 'border-brand-400 bg-brand-50 text-brand-700 dark:border-brand-600 dark:bg-brand-900/20 dark:text-brand-300'
                  : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:text-stone-800 dark:border-slate-700 dark:bg-transparent dark:text-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path fillRule="evenodd" d="M2.628 1.601C5.028 1.206 7.49 1 10 1s4.973.206 7.372.601a.75.75 0 0 1 .628.74v2.288a2.25 2.25 0 0 1-.659 1.59l-4.682 4.683a2.25 2.25 0 0 0-.659 1.59v3.037c0 .684-.31 1.33-.844 1.757l-1.937 1.55A.75.75 0 0 1 8 18.25v-5.757a2.25 2.25 0 0 0-.659-1.591L2.659 6.22A2.25 2.25 0 0 1 2 4.629V2.34a.75.75 0 0 1 .628-.74z" clipRule="evenodd" />
              </svg>
              Filtro
              {(() => {
                const count = (turnoFilter ? 1 : 0) + (periodoInicio || periodoFim ? 1 : 0);
                return count > 0 ? (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">{count}</span>
                ) : null;
              })()}
            </button>

            {filterPanelOpen && (
              <div className="absolute left-0 top-full z-30 mt-1.5 w-72 rounded-xl border border-stone-200 bg-white shadow-lg dark:border-slate-700 dark:bg-[#131620]">
                <div className="border-b border-stone-100 px-4 py-3 dark:border-slate-800">
                  <p className="text-sm font-semibold text-stone-800 dark:text-slate-200">Filtro</p>
                </div>
                <div className="space-y-4 px-4 py-4">
                  {/* Turno */}
                  <div>
                    <p className="mb-1.5 text-xs font-semibold text-stone-500 dark:text-slate-400">Turno</p>
                    <select value={draftTurno} onChange={(e) => setDraftTurno(e.target.value)} className="input-base">
                      <option value="">Todos os turnos</option>
                      <option value="MANHA">Manhã</option>
                      <option value="TARDE">Tarde</option>
                    </select>
                  </div>
                  {/* Período de cadastro — inline */}
                  <div>
                    <p className="mb-1.5 text-xs font-semibold text-stone-500 dark:text-slate-400">Período de cadastro</p>
                    <button
                      onClick={() => setShowDatePicker((v) => !v)}
                      className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-all ${
                        periodoInicio || periodoFim
                          ? 'border-brand-400 bg-brand-50 text-brand-700 dark:border-brand-600 dark:bg-brand-900/20 dark:text-brand-300'
                          : 'border-stone-200 bg-stone-50 text-stone-500 hover:border-stone-300 dark:border-slate-700 dark:bg-white/[0.06] dark:text-slate-400'
                      }`}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4 shrink-0">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                      </svg>
                      <span className="flex-1 truncate whitespace-nowrap text-left">
                        {draftPeriodoInicio && draftPeriodoFim
                          ? `${fmtBR(draftPeriodoInicio)} → ${fmtBR(draftPeriodoFim)}`
                          : draftPeriodoInicio ? `A partir de ${fmtBR(draftPeriodoInicio)}` : 'Selecionar período'}
                      </span>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`h-3.5 w-3.5 shrink-0 transition-transform ${showDatePicker ? 'rotate-180' : ''}`}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                      </svg>
                    </button>
                    {showDatePicker && (
                      <div className="mt-2">
                        <CalendarRangePicker
                          inline
                          initialInicio={draftPeriodoInicio}
                          initialFim={draftPeriodoFim}
                          onApply={(ini, fim) => { setDraftPeriodoInicio(ini); setDraftPeriodoFim(fim); setShowDatePicker(false); }}
                          onClose={() => setShowDatePicker(false)}
                          showShortcuts={false}
                        />
                      </div>
                    )}
                    {(draftPeriodoInicio || draftPeriodoFim) && (
                      <button
                        onClick={() => { setDraftPeriodoInicio(''); setDraftPeriodoFim(''); }}
                        className="mt-1 text-xs text-stone-400 hover:text-stone-600 dark:text-slate-500 dark:hover:text-slate-300"
                      >
                        Limpar período
                      </button>
                    )}
                  </div>
                  {/* Ordenação */}
                  <div>
                    <p className="mb-1.5 text-xs font-semibold text-stone-500 dark:text-slate-400">Ordenação</p>
                    <select
                      value={draftSortAz ?? ''}
                      onChange={(e) => setDraftSortAz(e.target.value === '' ? null : (e.target.value as 'asc' | 'desc'))}
                      className="input-base"
                    >
                      <option value="asc">A → Z</option>
                      <option value="desc">Z → A</option>
                      <option value="">Sem ordenação</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-stone-100 px-4 py-3 dark:border-slate-800">
                  <button
                    onClick={() => {
                      setTurnoFilter('');
                      setPeriodoInicio('');
                      setPeriodoFim('');
                      setSortAz('asc');
                      setDraftTurno('');
                      setDraftSortAz('asc');
                      setDraftPeriodoInicio('');
                      setDraftPeriodoFim('');
                      setShowDatePicker(false);
                      setFilterPanelOpen(false);
                    }}
                    className="text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400"
                  >
                    Limpar filtros
                  </button>
                  <button
                    onClick={() => {
                      setTurnoFilter(draftTurno);
                      setSortAz(draftSortAz);
                      setPeriodoInicio(draftPeriodoInicio);
                      setPeriodoFim(draftPeriodoFim);
                      setShowDatePicker(false);
                      setFilterPanelOpen(false);
                    }}
                    className="rounded-xl bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1" />

          {/* Busca — estilo mensalidades */}
          <div className="flex min-w-52 items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 dark:border-slate-700 dark:bg-white/[0.06]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4 shrink-0 text-stone-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="Pesquise…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-sm text-stone-900 outline-none placeholder-stone-400 dark:text-slate-100 dark:placeholder-slate-500"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-stone-300 hover:text-stone-500 dark:text-slate-600 dark:hover:text-slate-400">
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            )}
          </div>

          {/* Gear — configurações de colunas */}
          <div ref={settingsRef} className="relative">
            <button
              onClick={() => setSettingsOpen((v) => !v)}
              title="Configurações de visualização"
              className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-all ${
                settingsOpen
                  ? 'border-brand-400 bg-brand-50 text-brand-600 dark:border-brand-600 dark:bg-brand-900/20 dark:text-brand-400'
                  : 'border-stone-200 bg-white text-stone-400 hover:border-stone-300 hover:text-stone-600 dark:border-slate-700 dark:bg-transparent dark:text-slate-500 dark:hover:border-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path fillRule="evenodd" d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.331 1.652a6.993 6.993 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l1.18 2.044a1 1 0 0 1-.205 1.251l-1.267 1.113a7.047 7.047 0 0 1 0 2.228l1.267 1.113a1 1 0 0 1 .206 1.25l-1.18 2.045a1 1 0 0 1-1.187.447l-1.598-.54a6.993 6.993 0 0 1-1.929 1.115l-.33 1.652a1 1 0 0 1-.98.804H8.82a1 1 0 0 1-.98-.804l-.331-1.652a6.993 6.993 0 0 1-1.929-1.115l-1.598.54a1 1 0 0 1-1.186-.447l-1.18-2.044a1 1 0 0 1 .205-1.251l1.267-1.114a7.05 7.05 0 0 1 0-2.227L1.821 7.773a1 1 0 0 1-.206-1.25l1.18-2.045a1 1 0 0 1 1.187-.447l1.598.54A6.992 6.992 0 0 1 7.51 3.456l.33-1.652ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
              </svg>
            </button>
            {settingsOpen && (
              <div className="absolute right-0 top-full z-30 mt-1.5 w-64 rounded-xl border border-stone-200 bg-white shadow-lg dark:border-slate-700 dark:bg-[#131620]">
                <div className="border-b border-stone-100 px-4 py-3 dark:border-slate-800">
                  <p className="text-sm font-semibold text-stone-800 dark:text-slate-200">Configurações de visualização</p>
                </div>
                <div className="px-4 py-3">
                  <p className="mb-2 text-xs font-semibold text-stone-500 dark:text-slate-400">Visualização de colunas</p>
                  <div className="space-y-2">
                    {ALL_COLUMNS.map((col) => (
                      <label key={col.key} className="flex cursor-pointer items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={visibleColumns.has(col.key)}
                          onChange={() => toggleColumn(col.key)}
                          className="h-4 w-4 rounded border-stone-300 accent-brand-600"
                        />
                        <span className="text-sm text-stone-700 dark:text-slate-300">{col.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Linha 2: Chips de status */}
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full border px-3.5 py-1 text-xs font-semibold transition-all ${
                statusFilter === s
                  ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
                  : 'border-stone-200 bg-white text-stone-600 hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:bg-white/[0.06] dark:text-slate-400 dark:hover:border-brand-500 dark:hover:text-brand-400'
              }`}
            >
              {s === '' ? 'Todos' : STATUS_LABELS[s]}
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
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="mx-auto mb-3 h-12 w-12 text-stone-300 dark:text-slate-700">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.627 48.627 0 0 1 12 20.904a48.627 48.627 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.57 50.57 0 0 0-2.658-.813A59.905 59.905 0 0 1 12 3.493a59.902 59.902 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />
          </svg>
          <p className="text-sm font-medium text-stone-500 dark:text-slate-400">Nenhum aluno encontrado</p>
          <p className="mt-1 text-xs text-stone-400 dark:text-slate-600">
            {hasActiveFilters ? 'Tente ajustar os filtros.' : 'Cadastre um novo aluno para começar.'}
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table-base">
            <thead className="table-head">
              <tr>
                {visibleColumns.has('cadastro') && <th className="table-th">Cadastro</th>}
                {visibleColumns.has('nome') && (
                  <th className="table-th">
                    <button
                      onClick={() => setSortAz((s) => s === 'asc' ? 'desc' : s === 'desc' ? null : 'asc')}
                      className="flex items-center gap-1 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                    >
                      Nome
                      <span className="text-stone-300 dark:text-slate-600">
                        {sortAz === 'asc' ? '↑' : sortAz === 'desc' ? '↓' : '↕'}
                      </span>
                    </button>
                  </th>
                )}
                {visibleColumns.has('nascimento') && <th className="table-th">Nascimento</th>}
                {visibleColumns.has('turno') && <th className="table-th">Turno</th>}
                {visibleColumns.has('responsavel') && <th className="table-th">Responsável</th>}
                {visibleColumns.has('status') && <th className="table-th">Status</th>}
                <th className="table-th w-28 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {alunosFiltrados.map((aluno) => (
                <tr key={aluno.id} className="table-row">
                  {visibleColumns.has('cadastro') && (
                    <td className="table-td tabular-nums text-stone-500 dark:text-slate-500">
                      {formatDate(aluno.createdAt)}
                    </td>
                  )}
                  {visibleColumns.has('nome') && (
                    <td className="table-td font-semibold text-stone-900 dark:text-slate-100">
                      {aluno.nome}
                    </td>
                  )}
                  {visibleColumns.has('nascimento') && (
                    <td className="table-td tabular-nums text-stone-600 dark:text-slate-400">
                      {formatDate(aluno.dataNascimento)}
                    </td>
                  )}
                  {visibleColumns.has('turno') && (
                    <td className="table-td">
                      <span className={`badge ${aluno.turno === 'MANHA' ? 'badge-blue' : 'badge-gray'}`}>
                        {aluno.turno === 'MANHA' ? 'Manhã' : 'Tarde'}
                      </span>
                    </td>
                  )}
                  {visibleColumns.has('responsavel') && (
                    <td className="table-td text-stone-600 dark:text-slate-400">
                      {(aluno.responsaveis.find((ar) => ar.isResponsavelFinanceiro) ?? aluno.responsaveis[0])?.responsavel.nome ?? '—'}
                    </td>
                  )}
                  {visibleColumns.has('status') && (
                    <td className="table-td">
                      <span className={STATUS_BADGE[aluno.status] ?? 'badge badge-gray'}>
                        {STATUS_LABELS[aluno.status] ?? aluno.status}
                      </span>
                    </td>
                  )}
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
                      {canAtendente && (
                        <button
                          onClick={() => {
                            setGerarMes(now.getMonth() + 1);
                            setGerarAno(now.getFullYear());
                            setMensalidadeError(null);
                            setModalGerarMensalidade(aluno);
                          }}
                          title="Gerar mensalidade"
                          className="rounded-lg p-1.5 text-forest-400 transition-colors hover:bg-forest-50 hover:text-forest-600 dark:text-forest-500 dark:hover:bg-forest-900/20 dark:hover:text-forest-400"
                        >
                          <IcoBanknote />
                        </button>
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


      {/* Modal de confirmação de exclusão */}
      {alunoParaDeletar && (
        <DeleteModal
          aluno={alunoParaDeletar}
          loading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(alunoParaDeletar.id)}
          onCancel={() => setAlunoParaDeletar(null)}
        />
      )}

      {/* Modal: Gerar Mensalidade rápida */}
      {modalGerarMensalidade && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => { setModalGerarMensalidade(null); setMensalidadeError(null); }}
        >
          <div
            className="card w-full max-w-sm mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-stone-900 dark:text-slate-100">Gerar Mensalidade</h2>
                <p className="mt-0.5 text-xs text-stone-400 dark:text-slate-500">{modalGerarMensalidade.nome}</p>
              </div>
              <button
                onClick={() => { setModalGerarMensalidade(null); setMensalidadeError(null); }}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 dark:hover:bg-white/[0.06]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setMensalidadeError(null);
                mutGerarMensalidade.mutate({
                  alunoId: modalGerarMensalidade.id,
                  mesReferencia: gerarMes,
                  anoReferencia: gerarAno,
                });
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-slate-400">Mês</label>
                  <select
                    value={gerarMes}
                    onChange={(e) => setGerarMes(Number(e.target.value))}
                    className="input-base"
                  >
                    {['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].map((m, i) => (
                      <option key={i + 1} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-slate-400">Ano</label>
                  <select
                    value={gerarAno}
                    onChange={(e) => setGerarAno(Number(e.target.value))}
                    className="input-base"
                  >
                    {Array.from({ length: new Date().getFullYear() + 4 - 2020 }, (_, i) => 2020 + i).map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
              {mensalidadeError && (
                <div className="flex items-start gap-2 rounded-xl border border-crimson-200 bg-crimson-50 px-4 py-3 text-sm text-crimson-600 dark:border-crimson-700/40 dark:bg-crimson-700/10 dark:text-crimson-300">
                  {mensalidadeError}
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={mutGerarMensalidade.isPending}
                  className="btn-primary flex-1"
                >
                  {mutGerarMensalidade.isPending ? 'Gerando…' : 'Gerar e ir para Mensalidades'}
                </button>
                <button
                  type="button"
                  onClick={() => { setModalGerarMensalidade(null); setMensalidadeError(null); }}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body,
      )}

      <Toast toast={toast} onClose={hideToast} />
    </div>
  );
}

export default function AlunosPage() {
  return (
    <Suspense>
      <AlunosContent />
    </Suspense>
  );
}
