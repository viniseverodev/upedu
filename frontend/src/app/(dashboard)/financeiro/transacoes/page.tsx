// Transações financeiras — S027

'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { DatePickerInput } from '@/components/ui/DatePickerInput';
import { zodResolver } from '@hookform/resolvers/zod';
import { AxiosError } from 'axios';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { createTransacaoSchema, createCategoriaSchema, type CreateTransacaoInput, type CreateCategoriaInput } from '@/schemas/index';
import { z } from 'zod';
import { useToast } from '@/hooks/useToast';
import { Toast } from '@/components/ui/Toast';
import { CalendarRangePicker } from '@/components/ui/CalendarRangePicker';

// ---------- Tipos ----------

interface Categoria { id: string; nome: string; tipo: string; removida: boolean }
interface Transacao {
  id: string; tipo: string; descricao: string; valor: number;
  dataTransacao: string; createdAt: string;
  categoria: { nome: string; tipo: string; removida: boolean; removidaEm: string | null };
}

// ---------- Helpers de data ----------

function pad2(n: number) { return String(n).padStart(2, '0'); }
function toDateStr(y: number, m: number, d: number) { return `${y}-${pad2(m + 1)}-${pad2(d)}`; }
function fmtBR(s: string) {
  if (!s) return '—';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}
function todayStr() {
  const d = new Date();
  return toDateStr(d.getFullYear(), d.getMonth(), d.getDate());
}
// ---------- Modal genérico ----------

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="card w-full max-w-md mx-4 p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-stone-900 dark:text-slate-100">{title}</h2>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 dark:hover:bg-white/[0.06]">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

// ---------- Helpers de componente ----------

function CategoriaRemovidaInfo({ removidaEm }: { removidaEm: string | null }) {
  if (!removidaEm) return null;
  const r = new Date(removidaEm);
  const localDateStr = toDateStr(r.getFullYear(), r.getMonth(), r.getDate());
  return (
    <p className="mt-1 text-[11px] text-stone-400 dark:text-slate-500">
      {fmtBR(localDateStr)} às {r.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
    </p>
  );
}

// ---------- Schemas locais ----------

const updateCategoriaSchema = z.object({
  nome: z.string().min(2, 'Nome é obrigatório').optional(),
  tipo: z.enum(['RECEITA', 'DESPESA']).optional(),
}).refine((d) => d.nome || d.tipo, 'Informe ao menos um campo para atualizar');
type UpdateCategoriaInput = z.infer<typeof updateCategoriaSchema>;

const updateTransacaoSchema = z.object({
  categoriaId: z.string().uuid('Categoria inválida').optional(),
  tipo: z.enum(['ENTRADA', 'SAIDA']).optional(),
  descricao: z.string().min(3, 'Mínimo 3 caracteres').optional(),
  valor: z.number().positive('Valor deve ser positivo').optional(),
  dataTransacao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida').optional(),
}).refine((d) => Object.values(d).some((v) => v !== undefined), 'Informe ao menos um campo para atualizar');

const bulkEditSchema = z.object({
  categoriaId: z.string().uuid().optional(),
  tipo: z.enum(['ENTRADA', 'SAIDA', '']).optional(),
  dataTransacao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

type UpdateTransacaoInput = z.infer<typeof updateTransacaoSchema>;
type BulkEditInput = z.infer<typeof bulkEditSchema>;

// ---------- Modal de Detalhes ----------

function TransacaoDetalhesModal({
  transacao,
  onClose,
  onEdit,
  onDelete,
}: {
  transacao: Transacao;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isEntrada = transacao.tipo === 'ENTRADA';
  const registradoEm = new Date(transacao.createdAt);
  const registradoEmDateStr = toDateStr(registradoEm.getFullYear(), registradoEm.getMonth(), registradoEm.getDate());
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="card w-full max-w-sm mx-4 overflow-hidden p-0">
        <div className={`relative px-6 pb-5 pt-6 ${isEntrada ? 'bg-forest-500 dark:bg-forest-600' : 'bg-crimson-500 dark:bg-crimson-600'}`}>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 text-white hover:bg-white/30"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
          <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
            {isEntrada ? 'Entrada' : 'Saída'}
          </p>
          <p className="mt-1 text-3xl font-bold text-white">
            {isEntrada ? '+' : '−'}{formatCurrency(transacao.valor)}
          </p>
        </div>
        <div className="px-6 py-5">
          <div className="divide-y divide-stone-100 dark:divide-slate-800">
            <div className="flex items-start justify-between gap-4 py-3">
              <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-stone-400 dark:text-slate-500">Categoria</span>
              <div className="min-w-0 text-right">
                <span className={`inline-block max-w-full truncate align-middle ${transacao.categoria.tipo === 'RECEITA' ? 'badge-green' : 'badge-red'}`}>
                  {transacao.categoria.nome}
                </span>
                {transacao.categoria.removida && (
                  <>
                    <span className="ml-1.5 inline-block rounded-full bg-stone-100 px-1.5 py-0.5 align-middle text-[10px] font-semibold uppercase text-stone-400 dark:bg-white/[0.06] dark:text-slate-500">Removida</span>
                    <CategoriaRemovidaInfo removidaEm={transacao.categoria.removidaEm} />
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-stone-400 dark:text-slate-500">Data</span>
              <span className="text-sm font-medium text-stone-800 dark:text-slate-200">
                {fmtBR(transacao.dataTransacao.slice(0, 10))}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-stone-400 dark:text-slate-500">Registrado em</span>
              <span className="text-sm font-medium text-stone-800 dark:text-slate-200">
                {fmtBR(registradoEmDateStr)}
                <span className="mx-1.5 text-stone-300 dark:text-slate-600">·</span>
                {registradoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="flex items-start justify-between gap-4 py-3">
              <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-stone-400 dark:text-slate-500">Descrição</span>
              <span className="text-right text-sm font-medium text-stone-800 dark:text-slate-200">{transacao.descricao}</span>
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            <button onClick={onEdit} className="flex-1 btn-secondary text-sm">Editar</button>
            <button
              onClick={onDelete}
              className="rounded-xl border border-crimson-200 bg-crimson-50 px-4 py-2 text-sm font-semibold text-crimson-600 hover:bg-crimson-100 dark:border-crimson-700/40 dark:bg-crimson-900/20 dark:text-crimson-400 dark:hover:bg-crimson-900/30"
            >
              Excluir
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ---------- Página ----------

export default function TransacoesPage() {
  // Período padrão: mês atual — memoizado para não recomputar a cada render
  const { defaultInicio, defaultFim } = useMemo(() => {
    const now = new Date();
    return {
      defaultInicio: toDateStr(now.getFullYear(), now.getMonth(), 1),
      defaultFim: toDateStr(
        now.getFullYear(),
        now.getMonth(),
        new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(),
      ),
    };
  }, []);

  const [periodoInicio, setPeriodoInicio] = useState(defaultInicio);
  const [periodoFim, setPeriodoFim] = useState(defaultFim);

  // Filtros client-side
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState('');

  // Rascunho do filtro — só commita ao clicar "Aplicar"
  const [draftTipo, setDraftTipo] = useState('');

  // Filtro popover
  const filterRef = useRef<HTMLDivElement>(null);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Mais ações dropdown
  const maisAcoesRef = useRef<HTMLDivElement>(null);
  const [maisAcoesOpen, setMaisAcoesOpen] = useState(false);

  // Período — dropdown dedicado
  const periodoRef = useRef<HTMLDivElement>(null);

  // Settings (colunas)
  const settingsRef = useRef<HTMLDivElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    () => new Set(['data', 'descricao', 'categoria', 'tipo', 'valor']),
  );
  const ALL_COLUMNS = [
    { key: 'data',      label: 'Data' },
    { key: 'descricao', label: 'Descrição' },
    { key: 'categoria', label: 'Categoria' },
    { key: 'tipo',      label: 'Tipo' },
    { key: 'valor',     label: 'Valor' },
  ] as const;
  function toggleColumn(key: string) {
    setVisibleColumns((prev) => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next; });
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterPanelOpen(false);
      if (periodoRef.current && !periodoRef.current.contains(e.target as Node)) setShowDatePicker(false);
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) setSettingsOpen(false);
      if (maisAcoesRef.current && !maisAcoesRef.current.contains(e.target as Node)) setMaisAcoesOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Seleção em lote
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());

  // Modais
  const [showTransacaoModal, setShowTransacaoModal] = useState(false);
  const [detalhes, setDetalhes] = useState<Transacao | null>(null);
  const [editando, setEditando] = useState<Transacao | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Transacao | null>(null);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [showCategoriaModal, setShowCategoriaModal] = useState(false);
  const [editandoCategoria, setEditandoCategoria] = useState<Categoria | null>(null);
  const [confirmDeleteCategoria, setConfirmDeleteCategoria] = useState<Categoria | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverErrorCat, setServerErrorCat] = useState<string | null>(null);

  const { toast, showToast, hideToast } = useToast();

  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['transacoes'] });

  // ---------- Queries ----------

  const { data: transacoes = [], isLoading } = useQuery<Transacao[]>({
    queryKey: ['transacoes', periodoInicio, periodoFim],
    queryFn: () => api.get(`/transacoes?dataInicio=${periodoInicio}&dataFim=${periodoFim}`).then((r) => r.data),
  });

  const { data: categorias = [] } = useQuery<Categoria[]>({
    queryKey: ['categorias'],
    queryFn: () => api.get('/categorias').then((r) => r.data),
  });

  // ---------- Forms ----------

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<CreateTransacaoInput>({
    resolver: zodResolver(createTransacaoSchema),
    defaultValues: { dataTransacao: todayStr() },
  });

  const { register: registerEdit, handleSubmit: handleEdit, reset: resetEdit, control: controlEdit, formState: { errors: errorsEdit } } = useForm<UpdateTransacaoInput>({ resolver: zodResolver(updateTransacaoSchema) });

  const { register: registerBulkEdit, handleSubmit: handleBulkEdit, reset: resetBulkEdit, control: controlBulkEdit } = useForm<BulkEditInput>();

  const { register: registerCat, handleSubmit: handleCat, reset: resetCat, formState: { errors: errorsCat } } = useForm<CreateCategoriaInput>({ resolver: zodResolver(createCategoriaSchema) });

  const { register: registerEditCat, handleSubmit: handleEditCat, reset: resetEditCat, formState: { errors: errorsEditCat } } = useForm<UpdateCategoriaInput>({ resolver: zodResolver(updateCategoriaSchema) });

  // ---------- Mutations ----------

  const createMutation = useMutation({
    mutationFn: (data: CreateTransacaoInput) => api.post('/transacoes', data),
    onSuccess: () => { invalidate(); setShowTransacaoModal(false); reset(); setServerError(null); showToast('Transação registrada', 'A transação foi registrada com sucesso.'); },
    onError: (error: AxiosError<{ message: string }>) => { setServerError(error.response?.data?.message ?? 'Erro ao registrar transação.'); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTransacaoInput }) => api.patch(`/transacoes/${id}`, data),
    onSuccess: () => { invalidate(); setEditando(null); resetEdit(); setServerError(null); showToast('Transação atualizada', 'As alterações foram salvas com sucesso.'); },
    onError: (error: AxiosError<{ message: string }>) => { setServerError(error.response?.data?.message ?? 'Erro ao atualizar transação.'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/transacoes/${id}`),
    onSuccess: () => { invalidate(); setConfirmDelete(null); setSelecionados(new Set()); setServerError(null); showToast('Transação excluída', 'A transação foi removida com sucesso.', 'warning'); },
    onError: (error: AxiosError<{ message: string }>) => { setServerError(error.response?.data?.message ?? 'Erro ao excluir transação.'); },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => api.delete('/transacoes/bulk', { data: { ids } }),
    onSuccess: () => { invalidate(); setShowBulkDelete(false); setSelecionados(new Set()); setServerError(null); showToast('Transações excluídas', 'As transações selecionadas foram removidas.', 'warning'); },
    onError: (error: AxiosError<{ message: string }>) => { setServerError(error.response?.data?.message ?? 'Erro ao excluir transações.'); },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: (data: BulkEditInput & { ids: string[] }) => api.patch('/transacoes/bulk', data),
    onSuccess: () => { invalidate(); setShowBulkEdit(false); setSelecionados(new Set()); resetBulkEdit(); showToast('Transações atualizadas', 'As alterações foram aplicadas com sucesso.'); },
    onError: (error: AxiosError<{ message: string }>) => { setServerError(error.response?.data?.message ?? 'Erro ao atualizar transações.'); },
  });

  const invalidateCategorias = () => {
    queryClient.invalidateQueries({ queryKey: ['categorias'] });
    queryClient.invalidateQueries({ queryKey: ['transacoes'] });
  };

  const categoriaMutation = useMutation({
    mutationFn: (data: CreateCategoriaInput) => api.post('/categorias', data),
    onSuccess: () => { invalidateCategorias(); resetCat(); setServerErrorCat(null); showToast('Categoria criada', 'A categoria foi criada com sucesso.'); },
    onError: (error: AxiosError<{ message: string }>) => { setServerErrorCat(error.response?.data?.message ?? 'Erro ao criar categoria.'); },
  });

  const updateCategoriaMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCategoriaInput }) => api.patch(`/categorias/${id}`, data),
    onSuccess: () => { invalidateCategorias(); setEditandoCategoria(null); resetEditCat(); setServerErrorCat(null); showToast('Categoria atualizada', 'As alterações foram salvas com sucesso.'); },
    onError: (error: AxiosError<{ message: string }>) => { setServerErrorCat(error.response?.data?.message ?? 'Erro ao atualizar categoria.'); },
  });

  const deleteCategoriaMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/categorias/${id}`),
    onSuccess: () => { invalidateCategorias(); setConfirmDeleteCategoria(null); showToast('Categoria removida', 'A categoria foi removida com sucesso.', 'warning'); },
    onError: (error: AxiosError<{ message: string }>) => { setServerErrorCat(error.response?.data?.message ?? 'Erro ao remover categoria.'); },
  });

  // ---------- Período ----------

  const periodoAlterado = periodoInicio !== defaultInicio || periodoFim !== defaultFim;

  useEffect(() => { setSelecionados(new Set()); }, [periodoInicio, periodoFim]);

  // ---------- Filtro client-side ----------

  const transacoesFiltradas = useMemo(() => {
    return transacoes.filter((t) => {
      if (tipoFilter && t.tipo !== tipoFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!t.descricao.toLowerCase().includes(q) && !t.categoria.nome.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [transacoes, tipoFilter, search]);

  // ---------- Seleção ----------

  const todosIds = transacoesFiltradas.map((t) => t.id);
  const todosSelecionados = todosIds.length > 0 && todosIds.every((id) => selecionados.has(id));
  const algumSelecionado = selecionados.size > 0;

  function toggleTodos() {
    if (todosSelecionados) setSelecionados(new Set());
    else setSelecionados(new Set(todosIds));
  }

  function toggleItem(id: string) {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // ---------- Resumo ----------

  const totalEntradas = Math.round(transacoes.filter((t) => t.tipo === 'ENTRADA').reduce((s, t) => s + t.valor, 0) * 100) / 100;
  const totalSaidas = Math.round(transacoes.filter((t) => t.tipo === 'SAIDA').reduce((s, t) => s + t.valor, 0) * 100) / 100;
  const saldo = Math.round((totalEntradas - totalSaidas) * 100) / 100;

  // ---------- Handlers ----------

  function abrirEditar(t: Transacao) {
    setEditando(t);
    setServerError(null);
    resetEdit({
      tipo: t.tipo as 'ENTRADA' | 'SAIDA',
      descricao: t.descricao,
      valor: t.valor,
      dataTransacao: t.dataTransacao.slice(0, 10),
    });
  }

  function submitBulkEdit(data: BulkEditInput) {
    const payload: Record<string, unknown> = { ids: Array.from(selecionados) };
    if (data.categoriaId) payload.categoriaId = data.categoriaId;
    if (data.tipo) payload.tipo = data.tipo;
    if (data.dataTransacao) payload.dataTransacao = data.dataTransacao;
    setServerError(null);
    bulkUpdateMutation.mutate(payload as BulkEditInput & { ids: string[] });
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Transações</h1>
          <p className="mt-0.5 text-sm text-stone-400 dark:text-slate-500">
            {isLoading ? '…' : `${transacoesFiltradas.length} transaç${transacoesFiltradas.length !== 1 ? 'ões' : 'ão'}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowCategoriaModal(true)} className="btn-secondary py-2 text-xs">Categorias</button>
          <button onClick={() => { setShowTransacaoModal(true); setServerError(null); }} className="btn-primary py-2 text-xs">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5z" /></svg>
            Nova Transação
          </button>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-forest-500 dark:text-forest-300">Entradas</p>
          <p className="mt-2 text-xl font-bold text-forest-500 dark:text-forest-300">{formatCurrency(totalEntradas)}</p>
        </div>
        <div className="card p-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-crimson-500 dark:text-crimson-300">Saídas</p>
          <p className="mt-2 text-xl font-bold text-crimson-500 dark:text-crimson-300">{formatCurrency(totalSaidas)}</p>
        </div>
        <div className="card p-5 text-center">
          <p className={`text-xs font-semibold uppercase tracking-wide ${saldo >= 0 ? 'text-brand-600 dark:text-brand-300' : 'text-crimson-500 dark:text-crimson-300'}`}>Saldo</p>
          <p className={`mt-2 text-xl font-bold ${saldo >= 0 ? 'text-brand-600 dark:text-brand-300' : 'text-crimson-500 dark:text-crimson-300'}`}>{formatCurrency(saldo)}</p>
        </div>
      </div>

      {/* Barra de filtros */}
      <div className="card p-4 space-y-3">

        {/* Linha 1: Filtro (esq) + Busca (dir) */}
        <div className="flex items-center gap-2">

          {/* Filtro — popover */}
          <div ref={filterRef} className="relative">
            <button
              onClick={() => {
                setDraftTipo(tipoFilter);
                setShowDatePicker(false);
                setFilterPanelOpen((v) => !v);
              }}
              className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-all ${
                filterPanelOpen || tipoFilter
                  ? 'border-brand-400 bg-brand-50 text-brand-700 dark:border-brand-600 dark:bg-brand-900/20 dark:text-brand-300'
                  : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:text-stone-800 dark:border-slate-700 dark:bg-transparent dark:text-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path fillRule="evenodd" d="M2.628 1.601C5.028 1.206 7.49 1 10 1s4.973.206 7.372.601a.75.75 0 0 1 .628.74v2.288a2.25 2.25 0 0 1-.659 1.59l-4.682 4.683a2.25 2.25 0 0 0-.659 1.59v3.037c0 .684-.31 1.33-.844 1.757l-1.937 1.55A.75.75 0 0 1 8 18.25v-5.757a2.25 2.25 0 0 0-.659-1.591L2.659 6.22A2.25 2.25 0 0 1 2 4.629V2.34a.75.75 0 0 1 .628-.74z" clipRule="evenodd" />
              </svg>
              Filtro
              {tipoFilter && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">1</span>
              )}
            </button>

            {filterPanelOpen && (
              <div className="absolute left-0 top-full z-30 mt-1.5 w-72 rounded-xl border border-stone-200 bg-white shadow-lg dark:border-slate-700 dark:bg-[#131620]">
                <div className="border-b border-stone-100 px-4 py-3 dark:border-slate-800">
                  <p className="text-sm font-semibold text-stone-800 dark:text-slate-200">Filtro</p>
                </div>
                <div className="px-4 py-4">
                  <p className="mb-1.5 text-xs font-semibold text-stone-500 dark:text-slate-400">Tipo</p>
                  <select value={draftTipo} onChange={(e) => setDraftTipo(e.target.value)} className="input-base">
                    <option value="">Todos</option>
                    <option value="ENTRADA">Entrada</option>
                    <option value="SAIDA">Saída</option>
                  </select>
                </div>
                <div className="flex items-center justify-between border-t border-stone-100 px-4 py-3 dark:border-slate-800">
                  <button
                    onClick={() => { setTipoFilter(''); setDraftTipo(''); setFilterPanelOpen(false); }}
                    className="text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400"
                  >
                    Limpar
                  </button>
                  <button
                    onClick={() => { setTipoFilter(draftTipo); setFilterPanelOpen(false); }}
                    className="rounded-xl bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mais ações dropdown */}
          <div ref={maisAcoesRef} className="relative">
            <button
              onClick={() => setMaisAcoesOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-sm font-medium text-stone-600 transition-all hover:border-stone-300 hover:text-stone-800 dark:border-slate-700 dark:bg-transparent dark:text-slate-300 dark:hover:border-slate-600"
            >
              Mais ações
              <svg viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 transition-transform ${maisAcoesOpen ? 'rotate-180' : ''}`}>
                <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06z" clipRule="evenodd" />
              </svg>
            </button>

            {maisAcoesOpen && (
              <div className="absolute left-0 top-full z-30 mt-1.5 w-56 rounded-xl border border-stone-200 bg-white py-1.5 shadow-lg dark:border-slate-700 dark:bg-[#131620]">
                <p className="px-3 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-slate-500">
                  Ações em lote
                  {algumSelecionado && <span className="ml-1 text-brand-500">({selecionados.size})</span>}
                </p>
                <button
                  onClick={() => { setMaisAcoesOpen(false); if (algumSelecionado) { setShowBulkEdit(true); setServerError(null); resetBulkEdit(); } }}
                  disabled={!algumSelecionado}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-stone-700 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-white/[0.06]"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-brand-500">
                    <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65z" />
                    <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
                  </svg>
                  Editar selecionados
                </button>
                <button
                  onClick={() => { setMaisAcoesOpen(false); if (algumSelecionado) setShowBulkDelete(true); }}
                  disabled={!algumSelecionado}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-crimson-600 transition-colors hover:bg-crimson-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-crimson-400 dark:hover:bg-crimson-900/20"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 3.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
                  </svg>
                  Excluir selecionados
                </button>
              </div>
            )}
          </div>

          {/* Período — dropdown dedicado */}
          <div ref={periodoRef} className="relative">
            <button
              onClick={() => setShowDatePicker((v) => !v)}
              className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-all ${
                periodoAlterado
                  ? 'border-brand-400 bg-brand-50 text-brand-700 dark:border-brand-600 dark:bg-brand-900/20 dark:text-brand-300'
                  : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:text-stone-800 dark:border-slate-700 dark:bg-transparent dark:text-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
              <span className="whitespace-nowrap">
                {fmtBR(periodoInicio)} → {fmtBR(periodoFim)}
              </span>
              {periodoAlterado && (
                <button
                  onClick={(e) => { e.stopPropagation(); setPeriodoInicio(defaultInicio); setPeriodoFim(defaultFim); }}
                  className="ml-0.5 text-brand-400 hover:text-brand-600 dark:text-brand-500 dark:hover:text-brand-300"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
              )}
            </button>

            {showDatePicker && (
              <div className="absolute left-0 top-full z-30 mt-1.5 rounded-2xl border border-stone-200 bg-white shadow-2xl dark:border-slate-700/60 dark:bg-[#0c0e14]">
                <CalendarRangePicker
                  inline
                  initialInicio={periodoInicio}
                  initialFim={periodoFim}
                  onApply={(ini, fim) => { setPeriodoInicio(ini); setPeriodoFim(fim); setShowDatePicker(false); }}
                  onClose={() => setShowDatePicker(false)}
                  showShortcuts
                />
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

        {/* Linha 2: Chips de tipo */}
        <div className="flex flex-wrap gap-2">
          {[['', 'Todos'], ['ENTRADA', 'Entrada'], ['SAIDA', 'Saída']].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setTipoFilter(v)}
              className={`rounded-full border px-3.5 py-1 text-xs font-semibold transition-all ${
                tipoFilter === v
                  ? v === 'ENTRADA'
                    ? 'border-forest-600 bg-forest-600 text-white shadow-sm'
                    : v === 'SAIDA'
                      ? 'border-crimson-600 bg-crimson-600 text-white shadow-sm'
                      : 'border-brand-600 bg-brand-600 text-white shadow-sm'
                  : 'border-stone-200 bg-white text-stone-600 hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:bg-white/[0.06] dark:text-slate-400 dark:hover:border-brand-500 dark:hover:text-brand-400'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      {isLoading ? <div className="skeleton h-64" /> :
       transacoesFiltradas.length === 0 ? (
        <div className="empty-state">
          <p className="text-sm text-stone-400 dark:text-slate-500">
            {transacoes.length === 0
              ? `Nenhuma transação em ${fmtBR(periodoInicio)} → ${fmtBR(periodoFim)}.`
              : 'Nenhuma transação encontrada para os filtros aplicados.'}
          </p>
        </div>
       ) : (
        <div className="table-container">
          <table className="table-base">
            <thead className="table-head">
              <tr>
                <th className="table-th w-10">
                  <input
                    type="checkbox"
                    checked={todosSelecionados}
                    onChange={toggleTodos}
                    className="h-4 w-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500"
                  />
                </th>
                {visibleColumns.has('data') && <th className="table-th">Data</th>}
                {visibleColumns.has('descricao') && <th className="table-th">Descrição</th>}
                {visibleColumns.has('categoria') && <th className="table-th">Categoria</th>}
                {visibleColumns.has('tipo') && <th className="table-th">Tipo</th>}
                {visibleColumns.has('valor') && <th className="table-th text-right">Valor</th>}
                <th className="table-th w-20"></th>
              </tr>
            </thead>
            <tbody>
              {transacoesFiltradas.map((t) => (
                <tr key={t.id} className={`table-row ${selecionados.has(t.id) ? 'bg-brand-50/40 dark:bg-brand-900/10' : ''}`}>
                  <td className="table-td">
                    <input
                      type="checkbox"
                      checked={selecionados.has(t.id)}
                      onChange={() => toggleItem(t.id)}
                      className="h-4 w-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500"
                    />
                  </td>
                  {visibleColumns.has('data') && <td className="table-td text-xs">{formatDate(t.dataTransacao.slice(0, 10))}</td>}
                  {visibleColumns.has('descricao') && <td className="table-td font-medium text-stone-900 dark:text-slate-100">{t.descricao}</td>}
                  {visibleColumns.has('categoria') && (
                    <td className="table-td">
                      <span className={t.categoria.tipo === 'RECEITA' ? 'badge-green' : 'badge-red'}>
                        {t.categoria.nome}{t.categoria.removida ? ' (Removida)' : ''}
                      </span>
                    </td>
                  )}
                  {visibleColumns.has('tipo') && (
                    <td className="table-td">
                      <span className={`badge ${t.tipo === 'ENTRADA' ? 'badge-green' : 'badge-red'}`}>
                        {t.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'}
                      </span>
                    </td>
                  )}
                  {visibleColumns.has('valor') && (
                    <td className="table-td text-right">
                      <span className={`font-semibold ${t.tipo === 'ENTRADA' ? 'text-forest-500 dark:text-forest-300' : 'text-crimson-500 dark:text-crimson-300'}`}>
                        {t.tipo === 'ENTRADA' ? '+' : '−'}{formatCurrency(t.valor)}
                      </span>
                    </td>
                  )}
                  <td className="table-td">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setDetalhes(t)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-white/[0.1] dark:hover:text-slate-300"
                        title="Ver detalhes"
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                          <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
                          <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <button
                        onClick={() => abrirEditar(t)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-white/[0.1] dark:hover:text-slate-300"
                        title="Editar"
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                          <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65z" />
                          <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setConfirmDelete(t)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 hover:bg-crimson-50 hover:text-crimson-600 dark:hover:bg-crimson-900/20 dark:hover:text-crimson-400"
                        title="Excluir"
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                          <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 3.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
       )}


      {/* Modal Detalhes */}
      {detalhes && (
        <TransacaoDetalhesModal
          transacao={detalhes}
          onClose={() => setDetalhes(null)}
          onEdit={() => { setDetalhes(null); abrirEditar(detalhes); }}
          onDelete={() => { setDetalhes(null); setConfirmDelete(detalhes); }}
        />
      )}

      {/* Modal Nova Transação */}
      {showTransacaoModal && (
        <Modal title="Nova Transação" onClose={() => { setShowTransacaoModal(false); reset(); setServerError(null); }}>
          <form onSubmit={handleSubmit((d) => { setServerError(null); createMutation.mutate(d); })} noValidate className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-slate-400">Tipo</label>
              <select {...register('tipo')} className={`input-base ${errors.tipo ? 'input-error' : ''}`}>
                <option value="ENTRADA">Entrada (Receita)</option>
                <option value="SAIDA">Saída (Despesa)</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-slate-400">Categoria</label>
              <select {...register('categoriaId')} className={`input-base ${errors.categoriaId ? 'input-error' : ''}`}>
                <option value="">Selecione…</option>
                {categorias.filter((c) => !c.removida).map((c) => <option key={c.id} value={c.id}>{c.nome} ({c.tipo})</option>)}
              </select>
              {errors.categoriaId && <p className="mt-1 text-xs text-crimson-500">{errors.categoriaId.message}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-slate-400">Descrição</label>
              <input {...register('descricao')} className={`input-base ${errors.descricao ? 'input-error' : ''}`} />
              {errors.descricao && <p className="mt-1 text-xs text-crimson-500">{errors.descricao.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-slate-400">Valor (R$)</label>
                <input type="number" step="0.01" min="0.01" {...register('valor', { valueAsNumber: true })} className={`input-base ${errors.valor ? 'input-error' : ''}`} />
                {errors.valor && <p className="mt-1 text-xs text-crimson-500">{errors.valor.message}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-slate-400">Data</label>
                <Controller
                  control={control}
                  name="dataTransacao"
                  render={({ field }) => (
                    <DatePickerInput value={field.value ?? ''} onChange={field.onChange} placeholder="Selecione a data" />
                  )}
                />
              </div>
            </div>
            {serverError && <div className="flex items-start gap-2 rounded-xl border border-crimson-200 bg-crimson-50 px-4 py-3 text-sm text-crimson-600 dark:border-crimson-700/40 dark:bg-crimson-700/10 dark:text-crimson-300">{serverError}</div>}
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={createMutation.isPending} className="btn-primary flex-1">
                {createMutation.isPending ? 'Salvando…' : 'Registrar'}
              </button>
              <button type="button" onClick={() => { setShowTransacaoModal(false); reset(); setServerError(null); }} className="btn-secondary">Cancelar</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Editar Transação */}
      {editando && (
        <Modal title="Editar Transação" onClose={() => { setEditando(null); resetEdit(); setServerError(null); }}>
          <form onSubmit={handleEdit((d) => { setServerError(null); updateMutation.mutate({ id: editando.id, data: d }); })} noValidate className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-slate-400">Tipo</label>
              <select {...registerEdit('tipo')} className="input-base">
                <option value="ENTRADA">Entrada (Receita)</option>
                <option value="SAIDA">Saída (Despesa)</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-slate-400">Categoria</label>
              <select {...registerEdit('categoriaId')} defaultValue={editando.categoria ? undefined : ''} className="input-base">
                <option value="">Manter atual</option>
                {categorias.filter((c) => !c.removida).map((c) => <option key={c.id} value={c.id}>{c.nome} ({c.tipo})</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-slate-400">Descrição</label>
              <input {...registerEdit('descricao')} className={`input-base ${errorsEdit.descricao ? 'input-error' : ''}`} />
              {errorsEdit.descricao && <p className="mt-1 text-xs text-crimson-500">{errorsEdit.descricao.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-slate-400">Valor (R$)</label>
                <input type="number" step="0.01" min="0.01" {...registerEdit('valor', { valueAsNumber: true })} className={`input-base ${errorsEdit.valor ? 'input-error' : ''}`} />
                {errorsEdit.valor && <p className="mt-1 text-xs text-crimson-500">{errorsEdit.valor.message}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-slate-400">Data</label>
                <Controller
                  control={controlEdit}
                  name="dataTransacao"
                  render={({ field }) => (
                    <DatePickerInput value={field.value ?? ''} onChange={field.onChange} placeholder="Selecione a data" />
                  )}
                />
              </div>
            </div>
            {serverError && <div className="flex items-start gap-2 rounded-xl border border-crimson-200 bg-crimson-50 px-4 py-3 text-sm text-crimson-600 dark:border-crimson-700/40 dark:bg-crimson-700/10 dark:text-crimson-300">{serverError}</div>}
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={updateMutation.isPending} className="btn-primary flex-1">
                {updateMutation.isPending ? 'Salvando…' : 'Salvar alterações'}
              </button>
              <button type="button" onClick={() => { setEditando(null); resetEdit(); setServerError(null); }} className="btn-secondary">Cancelar</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Confirmar Exclusão */}
      {confirmDelete && (
        <Modal title="Excluir transação" onClose={() => { setConfirmDelete(null); setServerError(null); }}>
          <div className="space-y-4">
            <p className="text-sm text-stone-600 dark:text-slate-400">
              Tem certeza que deseja excluir a transação{' '}
              <strong className="text-stone-900 dark:text-slate-100">{confirmDelete.descricao}</strong>{' '}
              de{' '}
              <strong className={confirmDelete.tipo === 'ENTRADA' ? 'text-forest-600' : 'text-crimson-600'}>
                {formatCurrency(confirmDelete.valor)}
              </strong>
              ? Esta ação não pode ser desfeita.
            </p>
            {serverError && <div className="flex items-start gap-2 rounded-xl border border-crimson-200 bg-crimson-50 px-4 py-3 text-sm text-crimson-600 dark:border-crimson-700/40 dark:bg-crimson-700/10 dark:text-crimson-300">{serverError}</div>}
            <div className="flex gap-3">
              <button
                onClick={() => deleteMutation.mutate(confirmDelete.id)}
                disabled={deleteMutation.isPending}
                className="flex-1 rounded-xl bg-crimson-600 px-4 py-2 text-sm font-semibold text-white hover:bg-crimson-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Excluindo…' : 'Excluir'}
              </button>
              <button onClick={() => { setConfirmDelete(null); setServerError(null); }} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Confirmar Exclusão em Lote */}
      {showBulkDelete && (
        <Modal title="Excluir transações" onClose={() => { setShowBulkDelete(false); setServerError(null); }}>
          <div className="space-y-4">
            <p className="text-sm text-stone-600 dark:text-slate-400">
              Tem certeza que deseja excluir{' '}
              <strong className="text-stone-900 dark:text-slate-100">{selecionados.size} transação{selecionados.size !== 1 ? 'ões' : ''}</strong>?
              Esta ação não pode ser desfeita.
            </p>
            {serverError && <div className="flex items-start gap-2 rounded-xl border border-crimson-200 bg-crimson-50 px-4 py-3 text-sm text-crimson-600 dark:border-crimson-700/40 dark:bg-crimson-700/10 dark:text-crimson-300">{serverError}</div>}
            <div className="flex gap-3">
              <button
                onClick={() => bulkDeleteMutation.mutate(Array.from(selecionados))}
                disabled={bulkDeleteMutation.isPending}
                className="flex-1 rounded-xl bg-crimson-600 px-4 py-2 text-sm font-semibold text-white hover:bg-crimson-700 disabled:opacity-50"
              >
                {bulkDeleteMutation.isPending ? 'Excluindo…' : `Excluir ${selecionados.size}`}
              </button>
              <button onClick={() => { setShowBulkDelete(false); setServerError(null); }} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Edição em Lote */}
      {showBulkEdit && (
        <Modal title={`Editar ${selecionados.size} transação${selecionados.size !== 1 ? 'ões' : ''}`} onClose={() => { setShowBulkEdit(false); resetBulkEdit(); setServerError(null); }}>
          <form onSubmit={handleBulkEdit(submitBulkEdit)} noValidate className="space-y-4">
            <p className="text-xs text-stone-500 dark:text-slate-400">
              Deixe os campos em branco para manter os valores existentes. Apenas os campos preenchidos serão alterados.
            </p>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-slate-400">Tipo</label>
              <select {...registerBulkEdit('tipo')} className="input-base">
                <option value="">Manter atual</option>
                <option value="ENTRADA">Entrada (Receita)</option>
                <option value="SAIDA">Saída (Despesa)</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-slate-400">Categoria</label>
              <select {...registerBulkEdit('categoriaId')} className="input-base">
                <option value="">Manter atual</option>
                {categorias.filter((c) => !c.removida).map((c) => <option key={c.id} value={c.id}>{c.nome} ({c.tipo})</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-slate-400">Data</label>
              <Controller
                control={controlBulkEdit}
                name="dataTransacao"
                render={({ field }) => (
                  <DatePickerInput value={field.value ?? ''} onChange={field.onChange} placeholder="Manter data atual" />
                )}
              />
            </div>
            {serverError && <div className="flex items-start gap-2 rounded-xl border border-crimson-200 bg-crimson-50 px-4 py-3 text-sm text-crimson-600 dark:border-crimson-700/40 dark:bg-crimson-700/10 dark:text-crimson-300">{serverError}</div>}
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={bulkUpdateMutation.isPending} className="btn-primary flex-1">
                {bulkUpdateMutation.isPending ? 'Salvando…' : 'Aplicar alterações'}
              </button>
              <button type="button" onClick={() => { setShowBulkEdit(false); resetBulkEdit(); setServerError(null); }} className="btn-secondary">Cancelar</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Gerenciar Categorias */}
      {showCategoriaModal && (
        <Modal title="Gerenciar Categorias" onClose={() => { setShowCategoriaModal(false); resetCat(); setServerErrorCat(null); }}>
          {/* Formulário nova categoria */}
          <form onSubmit={handleCat((d) => { setServerErrorCat(null); categoriaMutation.mutate(d); })} noValidate className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-slate-400">Nome</label>
                <input {...registerCat('nome')} placeholder="Ex: Aluguel" className={`input-base ${errorsCat.nome ? 'input-error' : ''}`} />
                {errorsCat.nome && <p className="mt-1 text-xs text-crimson-500">{errorsCat.nome.message}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-slate-400">Tipo</label>
                <select {...registerCat('tipo')} className="input-base">
                  <option value="RECEITA">Receita</option>
                  <option value="DESPESA">Despesa</option>
                </select>
              </div>
            </div>
            {serverErrorCat && !editandoCategoria && (
              <div className="rounded-xl border border-crimson-200 bg-crimson-50 px-3 py-2 text-xs text-crimson-600 dark:border-crimson-700/40 dark:bg-crimson-700/10 dark:text-crimson-300">{serverErrorCat}</div>
            )}
            <button type="submit" disabled={categoriaMutation.isPending} className="btn-primary w-full">
              {categoriaMutation.isPending ? 'Criando…' : 'Criar Categoria'}
            </button>
          </form>

          {/* Lista de categorias existentes */}
          {categorias.filter((c) => !c.removida).length > 0 && (
            <div className="mt-5 border-t border-stone-200 pt-4 dark:border-slate-800">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-slate-500">Categorias existentes</p>
              <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
                {categorias.filter((c) => !c.removida).map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-stone-50 dark:hover:bg-white/[0.08]">
                    <span className="text-sm font-medium text-stone-700 truncate dark:text-slate-300">{c.nome}</span>
                    <div className="flex shrink-0 items-center gap-1.5 ml-2">
                      <span className={c.tipo === 'RECEITA' ? 'badge-green' : 'badge-red'}>{c.tipo === 'RECEITA' ? 'Receita' : 'Despesa'}</span>
                      <button
                        onClick={() => { setEditandoCategoria(c); setServerErrorCat(null); resetEditCat({ nome: c.nome, tipo: c.tipo as 'RECEITA' | 'DESPESA' }); }}
                        className="flex h-6 w-6 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-white/[0.1] dark:hover:text-slate-300"
                        title="Editar"
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                          <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => { setConfirmDeleteCategoria(c); setServerErrorCat(null); }}
                        className="flex h-6 w-6 items-center justify-center rounded-lg text-stone-400 hover:bg-crimson-50 hover:text-crimson-600 dark:hover:bg-crimson-900/20 dark:hover:text-crimson-400"
                        title="Remover"
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                          <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 3.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Modal Editar Categoria */}
      {editandoCategoria && (
        <Modal title="Editar Categoria" onClose={() => { setEditandoCategoria(null); resetEditCat(); setServerErrorCat(null); }}>
          <form onSubmit={handleEditCat((d) => { setServerErrorCat(null); updateCategoriaMutation.mutate({ id: editandoCategoria.id, data: d }); })} noValidate className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-slate-400">Nome</label>
              <input {...registerEditCat('nome')} className={`input-base ${errorsEditCat.nome ? 'input-error' : ''}`} />
              {errorsEditCat.nome && <p className="mt-1 text-xs text-crimson-500">{errorsEditCat.nome.message}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-slate-400">Tipo</label>
              <select {...registerEditCat('tipo')} className="input-base">
                <option value="RECEITA">Receita</option>
                <option value="DESPESA">Despesa</option>
              </select>
            </div>
            {serverErrorCat && (
              <div className="rounded-xl border border-crimson-200 bg-crimson-50 px-3 py-2 text-xs text-crimson-600 dark:border-crimson-700/40 dark:bg-crimson-700/10 dark:text-crimson-300">{serverErrorCat}</div>
            )}
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={updateCategoriaMutation.isPending} className="btn-primary flex-1">
                {updateCategoriaMutation.isPending ? 'Salvando…' : 'Salvar'}
              </button>
              <button type="button" onClick={() => { setEditandoCategoria(null); resetEditCat(); setServerErrorCat(null); }} className="btn-secondary">Cancelar</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Confirmar Remoção de Categoria */}
      {confirmDeleteCategoria && (
        <Modal title="Remover categoria" onClose={() => { setConfirmDeleteCategoria(null); setServerErrorCat(null); }}>
          <div className="space-y-4">
            <p className="text-sm text-stone-600 dark:text-slate-400">
              Deseja remover a categoria{' '}
              <strong className="text-stone-900 dark:text-slate-100">{confirmDeleteCategoria.nome}</strong>?
            </p>
            <p className="text-xs text-stone-400 dark:text-slate-500">
              Se houver transações vinculadas, a categoria será mantida na listagem marcada como <strong>Removida</strong> e não estará disponível para novas transações.
            </p>
            {serverErrorCat && (
              <div className="rounded-xl border border-crimson-200 bg-crimson-50 px-3 py-2 text-xs text-crimson-600 dark:border-crimson-700/40 dark:bg-crimson-700/10 dark:text-crimson-300">{serverErrorCat}</div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => deleteCategoriaMutation.mutate(confirmDeleteCategoria.id)}
                disabled={deleteCategoriaMutation.isPending}
                className="flex-1 rounded-xl bg-crimson-600 px-4 py-2 text-sm font-semibold text-white hover:bg-crimson-700 disabled:opacity-50"
              >
                {deleteCategoriaMutation.isPending ? 'Removendo…' : 'Remover'}
              </button>
              <button onClick={() => { setConfirmDeleteCategoria(null); setServerErrorCat(null); }} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        </Modal>
      )}
      <Toast toast={toast} onClose={hideToast} />
    </div>
  );
}
