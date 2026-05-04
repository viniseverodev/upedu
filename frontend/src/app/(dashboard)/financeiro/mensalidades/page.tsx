// Mensalidades — S022/S023/S024

'use client';

import { useState, useRef, useEffect, useMemo, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { DatePickerInput } from '@/components/ui/DatePickerInput';
import { zodResolver } from '@hookform/resolvers/zod';
import { AxiosError } from 'axios';
import api from '@/lib/api';
import { formatCurrency, formatDate, formatMesAno } from '@/lib/utils';
import { usePermission } from '@/hooks/usePermission';
import { useToast } from '@/hooks/useToast';
import { Toast } from '@/components/ui/Toast';
import { CalendarRangePicker } from '@/components/ui/CalendarRangePicker';
import {
  createMensalidadeSchema,
  pagarMensalidadeSchema,
  cancelarMensalidadeSchema,
  estornarMensalidadeSchema,
  bulkPagarSchema,
  bulkCancelarSchema,
  type CreateMensalidadeInput,
  type PagarMensalidadeInput,
  type CancelarMensalidadeInput,
  type EstornarMensalidadeInput,
  type BulkPagarInput,
  type BulkCancelarInput,
} from '@/schemas/index';

// ---------- Tipos ----------

interface Aluno { id: string; nome: string; turno: string }

interface Mensalidade {
  id: string;
  alunoId: string;
  tipo: 'REGULAR' | 'OFICINA';
  oficinaNome: string | null;
  status: 'PENDENTE' | 'PARCIAL' | 'PAGO' | 'INADIMPLENTE' | 'CANCELADA';
  mesReferencia: number;
  anoReferencia: number;
  valorOriginal: number;
  valorDesconto: number;
  valorJuros: number;
  valorPago: number | null;
  dataVencimento: string;
  dataPagamento: string | null;
  formaPagamento: string | null;
  motivoCancelamento: string | null;
  aluno: {
    id: string;
    nome: string;
    turno: string;
    responsavelFinanceiro?: {
      nome: string;
      telefone?: string | null;
      email?: string | null;
      parentesco?: string | null;
    } | null;
  };
  pagamentos?: Array<{
    id: string;
    valor: number;
    formaPagamento: string;
    dataPagamento: string;
  }>;
}

// ---------- Constantes ----------

const MESES = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const FORMAS_PAGAMENTO = [
  'PIX',
  'Dinheiro',
  'Cartão de débito',
  'Cartão de crédito',
  'Cartão de crédito - 2x',
  'Cartão de crédito - 3x',
  'Cartão de crédito - 4x',
  'Cartão de crédito - 5x',
  'Cartão de crédito - 6x',
  'Cartão de crédito - 10x',
  'Cartão de crédito - 12x',
  'Transferência bancária',
  'Boleto',
];

const STATUS_BADGE: Record<string, string> = {
  PENDENTE: 'badge badge-yellow',
  PARCIAL: 'badge badge-orange',
  PAGO: 'badge badge-green',
  INADIMPLENTE: 'badge badge-red',
  CANCELADA: 'badge badge-gray',
};

const STATUS_LABEL: Record<string, string> = {
  PENDENTE: 'Pendente',
  PARCIAL: 'Parcial',
  PAGO: 'Pago',
  INADIMPLENTE: 'Inadimplente',
  CANCELADA: 'Cancelada',
};

const TURNO_LABEL: Record<string, string> = { MANHA: 'Manhã', TARDE: 'Tarde' };

// ---------- Helpers de data ----------

function pad2(n: number) { return String(n).padStart(2, '0'); }
function toDateStr(y: number, m: number, d: number) {
  return `${y}-${pad2(m + 1)}-${pad2(d)}`;
}
function fmtBR(s: string) {
  if (!s) return '—';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}
function todayStr() {
  const d = new Date();
  return toDateStr(d.getFullYear(), d.getMonth(), d.getDate());
}
// ---------- Motivo de cancelamento tooltip ----------

function MotivoTooltip({ motivo }: { motivo: string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative inline-flex cursor-default items-center gap-1.5"
      onMouseEnter={() => motivo && setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wide text-stone-400 dark:text-slate-500">
        Motivo:
      </span>
      <span className="max-w-[12rem] truncate text-xs text-stone-500 dark:text-slate-400">
        {motivo ?? '—'}
      </span>
      {open && motivo && (
        <span className="absolute bottom-full right-0 z-30 mb-2 w-72 rounded-xl border border-stone-100 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-[#0c0e14]">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-400 dark:text-slate-500">
            Motivo do cancelamento
          </span>
          <span className="block text-xs leading-relaxed text-stone-700 dark:text-slate-300">
            {motivo}
          </span>
        </span>
      )}
    </span>
  );
}

// ---------- Responsável info popover ----------

function ResponsavelInfo({ resp }: {
  resp?: { nome: string; telefone?: string | null; email?: string | null; parentesco?: string | null } | null;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  function openPopover() {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.top - 8, left: r.left });
    }
    setOpen(true);
  }

  return (
    <span className="inline-flex items-center">
      <button
        ref={btnRef}
        type="button"
        onMouseEnter={openPopover}
        onMouseLeave={() => setOpen(false)}
        onClick={() => (open ? setOpen(false) : openPopover())}
        className="ml-1.5 inline-flex items-center justify-center rounded-full p-0.5 text-stone-300 transition-colors hover:text-brand-500 dark:text-slate-600 dark:hover:text-brand-400"
        title="Ver responsável financeiro"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
          <path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 0 0-13.074.003Z" />
        </svg>
      </button>

      {open && createPortal(
        <span
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          style={{ position: 'fixed', top: pos.top, left: pos.left, transform: 'translateY(-100%)' }}
          className="z-50 mb-2 w-52 rounded-xl border border-stone-200/80 bg-white p-3 shadow-card-lg dark:border-white/[0.08] dark:bg-[#13181f]"
        >
          <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-stone-400 dark:text-slate-500">
            Responsável financeiro
          </span>
          {resp ? (
            <>
              <span className="block text-sm font-semibold text-stone-800 dark:text-slate-100">{resp.nome}</span>
              {resp.parentesco && (
                <span className="mt-0.5 block text-xs text-stone-400 dark:text-slate-500">{resp.parentesco}</span>
              )}
              {resp.telefone && (
                <span className="mt-1.5 flex items-center gap-1.5 text-xs text-stone-500 dark:text-slate-400">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3 shrink-0 text-stone-300 dark:text-slate-600">
                    <path fillRule="evenodd" d="M2 3.5A1.5 1.5 0 0 1 3.5 2h1.148a1.5 1.5 0 0 1 1.465 1.175l.716 3.223a1.5 1.5 0 0 1-1.052 1.767l-.933.267c-.41.117-.643.555-.48.95a11.542 11.542 0 0 0 6.254 6.254c.395.163.833-.07.95-.48l.267-.933a1.5 1.5 0 0 1 1.767-1.052l3.223.716A1.5 1.5 0 0 1 18 16.352V17.5a1.5 1.5 0 0 1-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 0 1 2.43 8.326 13.019 13.019 0 0 1 2 5V3.5Z" clipRule="evenodd" />
                  </svg>
                  {resp.telefone}
                </span>
              )}
              {resp.email && (
                <span className="mt-1 flex items-center gap-1.5 text-xs text-stone-500 dark:text-slate-400">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3 shrink-0 text-stone-300 dark:text-slate-600">
                    <path d="M3 4a2 2 0 0 0-2 2v1.161l8.441 4.221a1.25 1.25 0 0 0 1.118 0L19 7.162V6a2 2 0 0 0-2-2H3Z" />
                    <path d="m19 8.839-7.77 3.885a2.75 2.75 0 0 1-2.46 0L1 8.839V14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.839Z" />
                  </svg>
                  {resp.email}
                </span>
              )}
            </>
          ) : (
            <span className="block text-xs text-stone-400 dark:text-slate-500">
              Nenhum responsável financeiro cadastrado
            </span>
          )}
        </span>,
        document.body,
      )}
    </span>
  );
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

// ---------- AlunoCombobox ----------

function AlunoCombobox({ alunos, value, onChange, error }: {
  alunos: Aluno[];
  value: string;
  onChange: (id: string) => void;
  error?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = alunos.find((a) => a.id === value);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = alunos.filter((a) => a.nome.toLowerCase().includes(query.toLowerCase()));

  return (
    <div ref={ref} className="relative">
      <div className={`input-base flex cursor-text items-center gap-2 ${error ? 'input-error' : ''}`} onClick={() => setOpen(true)}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0 text-stone-400 dark:text-slate-500">
          <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
        </svg>
        <input
          type="text"
          placeholder={selected ? selected.nome : 'Buscar aluno por nome…'}
          value={open ? query : (selected?.nome ?? '')}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { setOpen(true); setQuery(''); }}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-stone-400 dark:placeholder:text-slate-500"
        />
        {selected && !open && (
          <button type="button" onClick={(e) => { e.stopPropagation(); onChange(''); setQuery(''); }} className="shrink-0 text-stone-400 hover:text-stone-600 dark:hover:text-slate-300">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        )}
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-stone-200 bg-white shadow-lg dark:border-slate-700 dark:bg-[#0c0e14]">
          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-stone-400 dark:text-slate-500">Nenhum aluno encontrado.</p>
            ) : (
              filtered.map((a) => (
                <button key={a.id} type="button" onClick={() => { onChange(a.id); setOpen(false); setQuery(''); }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-stone-50 dark:hover:bg-white/[0.06] ${a.id === value ? 'font-semibold text-brand-600 dark:text-brand-400' : 'text-stone-800 dark:text-slate-200'}`}>
                  <span>{a.nome}</span>
                  <span className="text-xs text-stone-400 dark:text-slate-500">{TURNO_LABEL[a.turno] ?? a.turno}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- YearPicker ----------

const YEAR_START = 2020;
const YEAR_END = new Date().getFullYear() + 3;

function YearPicker({ value, onChange }: { value: number; onChange: (y: number) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const years = Array.from({ length: YEAR_END - YEAR_START + 1 }, (_, i) => YEAR_START + i);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className="input-base flex w-full items-center justify-between">
        <span className="text-sm text-stone-900 dark:text-slate-100">{value}</span>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-stone-400">
          <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-stone-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-[#0c0e14]">
          <div className="grid grid-cols-3 gap-1">
            {years.map((y) => (
              <button key={y} type="button" onClick={() => { onChange(y); setOpen(false); }}
                className={`rounded-lg py-1.5 text-sm font-medium transition-colors ${y === value ? 'bg-brand-600 text-white' : 'text-stone-700 hover:bg-stone-100 dark:text-slate-300 dark:hover:bg-white/[0.06]'}`}>
                {y}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Página principal ----------

function MensalidadesContent() {
  const now = new Date();
  const hoje = todayStr();

  // Período padrão: mês corrente (1º ao último dia do mês)
  const defaultInicio = toDateStr(now.getFullYear(), now.getMonth(), 1);
  const defaultFim = toDateStr(
    now.getFullYear(),
    now.getMonth(),
    new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(),
  );

  const [periodoInicio, setPeriodoInicio] = useState(defaultInicio);
  const [periodoFim, setPeriodoFim] = useState(defaultFim);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Filtros client-side
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tipoFilter, setTipoFilter] = useState<'' | 'REGULAR' | 'OFICINA'>('');

  // Painéis da toolbar
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [maisAcoesOpen, setMaisAcoesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Rascunho do filtro — só commita ao clicar "Aplicar filtros"
  const [draftStatus, setDraftStatus] = useState('');
  const [draftTipo, setDraftTipo] = useState<'' | 'REGULAR' | 'OFICINA'>('');
  const filterRef = useRef<HTMLDivElement>(null);
  const maisAcoesRef = useRef<HTMLDivElement>(null);
  const periodoRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Colunas visíveis
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    () => new Set(['tipo', 'turno', 'referencia', 'vencimento', 'status', 'valor', 'pago']),
  );

  const ALL_COLUMNS = [
    { key: 'tipo', label: 'Tipo' },
    { key: 'turno', label: 'Turno' },
    { key: 'referencia', label: 'Referência' },
    { key: 'vencimento', label: 'Vencimento' },
    { key: 'status', label: 'Status' },
    { key: 'valor', label: 'Valor' },
    { key: 'pago', label: 'Pago' },
  ] as const;

  function toggleColumn(key: string) {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const [modalGerar, setModalGerar] = useState(false);
  const [modalPagar, setModalPagar] = useState<Mensalidade | null>(null);
  const [modalEstornar, setModalEstornar] = useState<Mensalidade | null>(null);
  const [modalCancelar, setModalCancelar] = useState<Mensalidade | null>(null);

  // Seleção em lote
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pagarFila, setPagarFila] = useState<Mensalidade[]>([]);
  const [pagarFilaTotal, setPagarFilaTotal] = useState(0);
  const [bulkCancelarItems, setBulkCancelarItems] = useState<{ id: string; nome: string; ref: string }[]>([]);
  const [bulkCancelarIndividual, setBulkCancelarIndividual] = useState(false);
  const [bulkCancelarMotivos, setBulkCancelarMotivos] = useState<Record<string, string>>({});
  const [bulkCancelarMotivoGlobal, setBulkCancelarMotivoGlobal] = useState('');
  // Estorno em lote: snapshot dos itens no momento de abrir o modal
  const [bulkEstornarItems, setBulkEstornarItems] = useState<{ id: string; nome: string; ref: string }[]>([]);
  const [bulkEstornarIndividual, setBulkEstornarIndividual] = useState(false);
  const [bulkEstornarMotivos, setBulkEstornarMotivos] = useState<Record<string, string>>({});
  const [bulkEstornarMotivoGlobal, setBulkEstornarMotivoGlobal] = useState('');

  const [serverError, setServerError] = useState<string | null>(null);
  const { toast, showToast, hideToast } = useToast();
  const queryClient = useQueryClient();
  const canGerente = usePermission('GERENTE_FILIAL');
  const canAtendente = usePermission('ATENDENTE');

  // Listagem (server-side: intervalo de datas)
  const { data: mensalidades = [], isLoading } = useQuery<Mensalidade[]>({
    queryKey: ['mensalidades', periodoInicio, periodoFim],
    queryFn: () =>
      api.get(`/mensalidades?dataInicio=${periodoInicio}&dataFim=${periodoFim}`).then((r) => r.data),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Alunos para o modal de geração
  const { data: alunos = [] } = useQuery<Aluno[]>({
    queryKey: ['alunos-ativos'],
    queryFn: () => api.get('/alunos?status=ATIVO').then((r) => r.data),
    enabled: modalGerar,
  });

  // Filtro client-side: nome + status + tipo
  const mensalidadesFiltradas = useMemo(() => {
    return mensalidades.filter((m) => {
      if (statusFilter && m.status !== statusFilter) return false;
      if (tipoFilter && m.tipo !== tipoFilter) return false;
      if (search && !m.aluno.nome.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [mensalidades, search, statusFilter, tipoFilter]);

  const hasActiveFilters = search || statusFilter || tipoFilter;

  function clearFilters() {
    setSearch('');
    setStatusFilter('');
    setTipoFilter('');
  }

  // Fechar dropdowns ao clicar fora
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterPanelOpen(false);
      if (maisAcoesRef.current && !maisAcoesRef.current.contains(e.target as Node)) setMaisAcoesOpen(false);
      if (periodoRef.current && !periodoRef.current.contains(e.target as Node)) setShowDatePicker(false);
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) setSettingsOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['mensalidades'] });

  // Resumo sobre todos os resultados do período (não filtrado)
  const totais = mensalidades.reduce(
    (acc, m) => {
      acc[m.status] = (acc[m.status] ?? 0) + 1;
      if (m.status === 'PAGO') acc.receitaPago += m.valorPago ?? 0;
      if (m.status === 'PARCIAL') acc.receitaPago += m.valorPago ?? 0;
      if (m.status === 'PENDENTE' || m.status === 'INADIMPLENTE') acc.emAberto += m.valorOriginal - m.valorDesconto;
      if (m.status === 'PARCIAL') acc.emAberto += m.valorOriginal - m.valorDesconto - (m.valorPago ?? 0);
      return acc;
    },
    { PENDENTE: 0, PARCIAL: 0, PAGO: 0, INADIMPLENTE: 0, CANCELADA: 0, receitaPago: 0, emAberto: 0 } as Record<string, number>,
  );

  // Formulários
  const formGerar = useForm<CreateMensalidadeInput>({
    resolver: zodResolver(createMensalidadeSchema),
    defaultValues: { mesReferencia: now.getMonth() + 1, anoReferencia: now.getFullYear() },
  });

  const mutGerar = useMutation({
    mutationFn: (data: CreateMensalidadeInput) => api.post('/mensalidades', data),
    onSuccess: () => {
      invalidate();
      setModalGerar(false);
      formGerar.reset({ mesReferencia: now.getMonth() + 1, anoReferencia: now.getFullYear() });
      setServerError(null);
      showToast('Mensalidade gerada', 'A mensalidade foi gerada com sucesso.');
    },
    onError: (err: AxiosError<{ message: string }>) => {
      setServerError(
        err.response?.data?.message ??
        'Não foi possível gerar a mensalidade. Verifique se o aluno está ativo e tente novamente.',
      );
    },
  });

  const formPagar = useForm<PagarMensalidadeInput>({
    resolver: zodResolver(pagarMensalidadeSchema),
    defaultValues: { splits: [{ formaPagamento: '', valor: 0 }], dataPagamento: hoje, valorDesconto: 0 },
  });
  const { fields: splitFields, append: appendSplit, remove: removeSplit } = useFieldArray({
    control: formPagar.control,
    name: 'splits',
  });

  // Abre o próximo item da fila de pagamento sequencial
  function abrirProximoDaFila(fila: Mensalidade[], total?: number) {
    if (fila.length === 0) {
      setPagarFila([]);
      setPagarFilaTotal(0);
      return;
    }
    const proximo = fila[0];
    const saldoRaw = proximo.status === 'PARCIAL'
      ? Math.max(0, proximo.valorOriginal - proximo.valorDesconto - (proximo.valorPago ?? 0))
      : proximo.valorOriginal - proximo.valorDesconto;
    const saldo = parseFloat(saldoRaw.toFixed(2));
    setPagarFila(fila);
    if (total !== undefined) setPagarFilaTotal(total);
    setModalPagar(proximo);
    setServerError(null);
    formPagar.reset({ splits: [{ formaPagamento: '', valor: saldo }], dataPagamento: hoje, valorDesconto: 0 });
  }

  const mutPagar = useMutation({
    mutationFn: ({ id, data }: { id: string; data: PagarMensalidadeInput }) =>
      api.patch(`/mensalidades/${id}/pagar`, data),
    onSuccess: () => {
      invalidate();
      setServerError(null);
      const filaRestante = pagarFila.slice(1);
      if (filaRestante.length > 0) {
        // Avança para o próximo da fila
        showToast('Pagamento registrado', 'Próximo aluno na fila…');
        abrirProximoDaFila(filaRestante);
      } else {
        // Fila concluída
        setPagarFila([]);
        setPagarFilaTotal(0);
        setModalPagar(null);
        formPagar.reset({ splits: [{ formaPagamento: '', valor: 0 }], dataPagamento: hoje, valorDesconto: 0 });
        showToast('Pagamento registrado', 'O pagamento foi registrado com sucesso.');
      }
    },
    onError: (err: AxiosError<{ message: string }>) => {
      setServerError(err.response?.data?.message ?? 'Erro ao registrar pagamento.');
    },
  });

  const formEstornar = useForm<EstornarMensalidadeInput>({
    resolver: zodResolver(estornarMensalidadeSchema),
  });

  const mutEstornar = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EstornarMensalidadeInput }) =>
      api.patch(`/mensalidades/${id}/estornar`, data),
    onSuccess: () => {
      invalidate();
      setModalEstornar(null);
      formEstornar.reset();
      setServerError(null);
      showToast('Pagamento estornado', 'O estorno foi registrado com sucesso.', 'warning');
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      setServerError(err.response?.data?.message ?? 'Erro ao estornar pagamento.');
    },
  });

  const formCancelar = useForm<CancelarMensalidadeInput>({
    resolver: zodResolver(cancelarMensalidadeSchema),
  });

  const mutCancelar = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CancelarMensalidadeInput }) =>
      api.patch(`/mensalidades/${id}/cancelar`, data),
    onSuccess: () => {
      invalidate();
      setModalCancelar(null);
      formCancelar.reset();
      setServerError(null);
      showToast('Mensalidade cancelada', 'A mensalidade foi cancelada.', 'warning');
    },
    onError: (err: AxiosError<{ message: string }>) => {
      setServerError(err.response?.data?.message ?? 'Erro ao cancelar mensalidade.');
    },
  });

  // ── Forms e mutations em lote ──
  const mutBulkCancelar = useMutation({
    mutationFn: (items: { id: string; motivoCancelamento: string }[]) =>
      api.post('/mensalidades/bulk/cancelar', { items }),
    onSuccess: (res) => {
      invalidate();
      setBulkCancelarItems([]);
      setBulkCancelarIndividual(false);
      setBulkCancelarMotivos({});
      setBulkCancelarMotivoGlobal('');
      setSelected(new Set());
      showToast('Cancelamento em lote', `${res.data.success} mensalidade(s) cancelada(s)${res.data.skipped > 0 ? ` · ${res.data.skipped} ignorada(s)` : ''}.`, 'warning');
    },
    onError: (err: AxiosError<{ message: string }>) => {
      setServerError(err.response?.data?.message ?? 'Erro ao cancelar em lote.');
    },
  });

  function submitBulkCancelar() {
    if (bulkCancelarIndividual) {
      const invalid = bulkCancelarItems.find((i) => (bulkCancelarMotivos[i.id] ?? '').trim().length < 3);
      if (invalid) { setServerError(`Motivo obrigatório para: ${invalid.nome}`); return; }
      mutBulkCancelar.mutate(bulkCancelarItems.map((i) => ({ id: i.id, motivoCancelamento: bulkCancelarMotivos[i.id].trim() })));
    } else {
      if (bulkCancelarMotivoGlobal.trim().length < 3) { setServerError('Motivo obrigatório (mín. 3 caracteres)'); return; }
      mutBulkCancelar.mutate(bulkCancelarItems.map((i) => ({ id: i.id, motivoCancelamento: bulkCancelarMotivoGlobal.trim() })));
    }
  }

  const mutBulkEstornar = useMutation({
    mutationFn: (items: { id: string; motivoEstorno: string }[]) =>
      api.post('/mensalidades/bulk/estornar', { items }),
    onSuccess: (res) => {
      invalidate();
      setBulkEstornarItems([]);
      setBulkEstornarIndividual(false);
      setBulkEstornarMotivos({});
      setBulkEstornarMotivoGlobal('');
      setSelected(new Set());
      const s = res.data.success;
      const sk = res.data.skipped;
      showToast('Estorno em lote', `${s} estorno${s !== 1 ? 's' : ''} realizado${s !== 1 ? 's' : ''}${sk > 0 ? ` · ${sk} ignorado${sk !== 1 ? 's' : ''}` : ''}.`, 'warning');
    },
    onError: (err: AxiosError<{ message: string }>) => {
      setServerError(err.response?.data?.message ?? 'Erro ao estornar em lote.');
    },
  });

  function abrirBulkEstornar() {
    const snapshot = selectedItems.map((m) => ({
      id: m.id,
      nome: m.aluno.nome,
      ref: `${MESES[m.mesReferencia]}/${m.anoReferencia}`,
    }));
    setBulkEstornarItems(snapshot);
    setBulkEstornarIndividual(false);
    setBulkEstornarMotivos(Object.fromEntries(snapshot.map((i) => [i.id, ''])));
    setBulkEstornarMotivoGlobal('');
    setServerError(null);
  }

  function submitBulkEstornar() {
    if (bulkEstornarIndividual) {
      const invalid = bulkEstornarItems.find((i) => (bulkEstornarMotivos[i.id] ?? '').trim().length < 3);
      if (invalid) {
        setServerError(`Preencha o motivo de "${invalid.nome}" (mín. 3 caracteres).`);
        return;
      }
      mutBulkEstornar.mutate(bulkEstornarItems.map((i) => ({ id: i.id, motivoEstorno: bulkEstornarMotivos[i.id].trim() })));
    } else {
      if (bulkEstornarMotivoGlobal.trim().length < 3) {
        setServerError('Motivo obrigatório (mín. 3 caracteres).');
        return;
      }
      mutBulkEstornar.mutate(bulkEstornarItems.map((i) => ({ id: i.id, motivoEstorno: bulkEstornarMotivoGlobal.trim() })));
    }
  }

  // ── Helpers de seleção ──
  const selectedItems = mensalidadesFiltradas.filter((m) => selected.has(m.id));
  const allPagaveis = selectedItems.every((m) => m.status === 'PENDENTE' || m.status === 'INADIMPLENTE');
  const allCancelaveis = selectedItems.every((m) => m.status === 'PENDENTE' || m.status === 'INADIMPLENTE');
  const allEstornaveis = selectedItems.every((m) => m.status === 'PAGO' || m.status === 'PARCIAL');
  const allPageSelected = mensalidadesFiltradas.length > 0 && mensalidadesFiltradas.every((m) => selected.has(m.id));
  const someSelected = selected.size > 0;

  function toggleAll() {
    if (allPageSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(mensalidadesFiltradas.map((m) => m.id)));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-5 p-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Mensalidades</h1>
          <p className="mt-0.5 text-sm text-stone-400 dark:text-slate-500">
            {isLoading ? '…' : `${mensalidadesFiltradas.length} de ${mensalidades.length} resultado${mensalidades.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {canAtendente && (
          <button
            onClick={() => { setModalGerar(true); setServerError(null); formGerar.reset({ mesReferencia: now.getMonth() + 1, anoReferencia: now.getFullYear() }); }}
            className="btn-primary"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5z" />
            </svg>
            Gerar Mensalidade
          </button>
        )}
      </div>

      {/* Cards — Inadimplentes → Pendentes → Pagos → Em aberto */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card p-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-crimson-500 dark:text-crimson-300">Inadimplentes</p>
          <p className="mt-1 text-2xl font-bold text-crimson-500 dark:text-crimson-300">{totais.INADIMPLENTE}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-yellow-600 dark:text-yellow-400">Pendentes</p>
          <p className="mt-1 text-2xl font-bold text-yellow-600 dark:text-yellow-400">{totais.PENDENTE}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-forest-500 dark:text-forest-300">Pagos</p>
          <p className="mt-1 text-2xl font-bold text-forest-500 dark:text-forest-300">{totais.PAGO}</p>
          <p className="mt-0.5 text-xs text-stone-400 dark:text-slate-500">{formatCurrency(totais.receitaPago)}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-slate-500">Em aberto</p>
          <p className="mt-1 text-xl font-bold text-stone-700 dark:text-slate-200">{formatCurrency(totais.emAberto)}</p>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="card p-4 space-y-3">

        {/* Linha principal: ações à esquerda + busca/config à direita */}
        <div className="flex items-center gap-2">

          {/* Filtro — popover */}
          <div ref={filterRef} className="relative">
            <button
              onClick={() => {
                setDraftStatus(statusFilter);
                setDraftTipo(tipoFilter);
                setFilterPanelOpen((v) => !v);
              }}
              className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-all ${
                filterPanelOpen || statusFilter || tipoFilter
                  ? 'border-brand-400 bg-brand-50 text-brand-700 dark:border-brand-600 dark:bg-brand-900/20 dark:text-brand-300'
                  : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:text-stone-800 dark:border-slate-700 dark:bg-transparent dark:text-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path fillRule="evenodd" d="M2.628 1.601C5.028 1.206 7.49 1 10 1s4.973.206 7.372.601a.75.75 0 0 1 .628.74v2.288a2.25 2.25 0 0 1-.659 1.59l-4.682 4.683a2.25 2.25 0 0 0-.659 1.59v3.037c0 .684-.31 1.33-.844 1.757l-1.937 1.55A.75.75 0 0 1 8 18.25v-5.757a2.25 2.25 0 0 0-.659-1.591L2.659 6.22A2.25 2.25 0 0 1 2 4.629V2.34a.75.75 0 0 1 .628-.74z" clipRule="evenodd" />
              </svg>
              Filtro
              {(() => {
                const count = (statusFilter ? 1 : 0) + (tipoFilter ? 1 : 0);
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
                  {/* Status */}
                  <div>
                    <p className="mb-1.5 text-xs font-semibold text-stone-500 dark:text-slate-400">Status</p>
                    <select
                      value={draftStatus}
                      onChange={(e) => setDraftStatus(e.target.value)}
                      className="input-base"
                    >
                      <option value="">Todos</option>
                      {(['INADIMPLENTE', 'PENDENTE', 'PARCIAL', 'PAGO', 'CANCELADA'] as const).map((s) => (
                        <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                      ))}
                    </select>
                  </div>

                  {/* Tipo */}
                  <div>
                    <p className="mb-1.5 text-xs font-semibold text-stone-500 dark:text-slate-400">Tipo</p>
                    <select
                      value={draftTipo}
                      onChange={(e) => setDraftTipo(e.target.value as '' | 'REGULAR' | 'OFICINA')}
                      className="input-base"
                    >
                      <option value="">Todos</option>
                      <option value="REGULAR">Mensalidade</option>
                      <option value="OFICINA">Oficinas</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-stone-100 px-4 py-3 dark:border-slate-800">
                  <button
                    onClick={() => {
                      setDraftStatus('');
                      setDraftTipo('');
                      clearFilters();
                      setFilterPanelOpen(false);
                    }}
                    className="text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400"
                  >
                    Limpar filtros
                  </button>
                  <button
                    onClick={() => {
                      setStatusFilter(draftStatus);
                      setTipoFilter(draftTipo ?? '');
                      setFilterPanelOpen(false);
                    }}
                    className="rounded-xl bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                  >
                    Aplicar filtros
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
              <div className="absolute left-0 top-full z-30 mt-1.5 w-52 rounded-xl border border-stone-200 bg-white py-1.5 shadow-lg dark:border-slate-700 dark:bg-[#131620]">
                <p className="px-3 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-slate-500">
                  Ações em lote
                  {someSelected && <span className="ml-1 text-brand-500">({selected.size})</span>}
                </p>
                <button
                  onClick={() => { setMaisAcoesOpen(false); if (someSelected && allPagaveis) { setServerError(null); abrirProximoDaFila(selectedItems, selectedItems.length); } }}
                  disabled={!someSelected || !allPagaveis}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-stone-700 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-white/[0.06]"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-brand-500">
                    <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                  </svg>
                  Pagar selecionados
                </button>
                <button
                  onClick={() => { setMaisAcoesOpen(false); if (someSelected && allEstornaveis) abrirBulkEstornar(); }}
                  disabled={!someSelected || !allEstornaveis}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-stone-700 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-white/[0.06]"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-amber-500">
                    <path fillRule="evenodd" d="M7.793 2.456a3.25 3.25 0 0 1 4.414 0l5.337 4.876A3.25 3.25 0 0 1 18.5 9.72v5.53A2.75 2.75 0 0 1 15.75 18h-11.5A2.75 2.75 0 0 1 1.5 15.25V9.72a3.25 3.25 0 0 1 .956-2.388L7.793 2.456ZM10 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm-1-4.25a1 1 0 0 1 2 0v2.5a1 1 0 0 1-2 0v-2.5Z" clipRule="evenodd" />
                  </svg>
                  Estornar selecionados
                </button>
                <button
                  onClick={() => {
                    setMaisAcoesOpen(false);
                    if (someSelected && allCancelaveis) {
                      setServerError(null);
                      setBulkCancelarIndividual(false);
                      setBulkCancelarMotivos({});
                      setBulkCancelarMotivoGlobal('');
                      setBulkCancelarItems(selectedItems.map((m) => ({
                        id: m.id, nome: m.aluno.nome,
                        ref: `${String(m.mesReferencia).padStart(2, '0')}/${m.anoReferencia}`,
                      })));
                    }
                  }}
                  disabled={!someSelected || !allCancelaveis}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-stone-700 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-white/[0.06]"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-crimson-500">
                    <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 3.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
                  </svg>
                  Cancelar selecionados
                </button>
              </div>
            )}
          </div>

          {/* Período — dropdown dedicado */}
          <div ref={periodoRef} className="relative">
            <button
              onClick={() => setShowDatePicker((v) => !v)}
              className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-all ${
                periodoInicio !== defaultInicio || periodoFim !== defaultFim
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
              {(periodoInicio !== defaultInicio || periodoFim !== defaultFim) && (
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

          {/* Busca por nome */}
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

          {/* Configurações de colunas */}
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

        {/* Pré-filtros rápidos */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setStatusFilter(''); setTipoFilter(''); }}
            className={`rounded-full border px-3.5 py-1 text-xs font-semibold transition-all ${
              !statusFilter && !tipoFilter
                ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
                : 'border-stone-200 bg-white text-stone-600 hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:bg-white/[0.06] dark:text-slate-400 dark:hover:border-brand-500 dark:hover:text-brand-400'
            }`}
          >
            Todos
          </button>
          {(['INADIMPLENTE', 'PENDENTE', 'PARCIAL', 'PAGO', 'CANCELADA'] as const).map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setTipoFilter(''); }}
              className={`rounded-full border px-3.5 py-1 text-xs font-semibold transition-all ${
                statusFilter === s && !tipoFilter
                  ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
                  : 'border-stone-200 bg-white text-stone-600 hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:bg-white/[0.06] dark:text-slate-400 dark:hover:border-brand-500 dark:hover:text-brand-400'
              }`}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
          <span className="self-center text-stone-200 dark:text-slate-700">|</span>
          <button
            onClick={() => { setTipoFilter('OFICINA'); setStatusFilter(''); }}
            className={`rounded-full border px-3.5 py-1 text-xs font-semibold transition-all ${
              tipoFilter === 'OFICINA'
                ? 'border-violet-600 bg-violet-600 text-white shadow-sm'
                : 'border-stone-200 bg-white text-stone-600 hover:border-violet-400 hover:text-violet-600 dark:border-slate-700 dark:bg-white/[0.06] dark:text-slate-400 dark:hover:border-violet-500 dark:hover:text-violet-400'
            }`}
          >
            Oficinas
          </button>
        </div>
      </div>


      {/* Tabela */}
      {isLoading ? (
        <div className="skeleton h-64" />
      ) : mensalidadesFiltradas.length === 0 ? (
        <div className="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="mx-auto mb-3 h-12 w-12 text-stone-300 dark:text-slate-700">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
          </svg>
          <p className="text-sm font-medium text-stone-500 dark:text-slate-400">
            {hasActiveFilters ? 'Nenhum resultado para os filtros aplicados.' : `Nenhuma mensalidade entre ${fmtBR(periodoInicio)} e ${fmtBR(periodoFim)}.`}
          </p>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="mt-3 text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="table-container">
          <table className="table-base">
            <thead className="table-head">
              <tr>
                <th className="table-th w-10">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-stone-300 accent-brand-600"
                    title="Selecionar todos"
                  />
                </th>
                <th className="table-th">Aluno</th>
                {visibleColumns.has('tipo') && <th className="table-th">Tipo</th>}
                {visibleColumns.has('turno') && <th className="table-th">Turno</th>}
                {visibleColumns.has('referencia') && <th className="table-th">Referência</th>}
                {visibleColumns.has('vencimento') && <th className="table-th">Vencimento</th>}
                {visibleColumns.has('status') && <th className="table-th">Status</th>}
                {visibleColumns.has('valor') && <th className="table-th text-right">Valor</th>}
                {visibleColumns.has('pago') && <th className="table-th text-right">Pago</th>}
                <th className="table-th" />
              </tr>
            </thead>
            <tbody>
              {mensalidadesFiltradas.map((m) => (
                <tr key={m.id} className={`table-row ${selected.has(m.id) ? 'bg-brand-50 dark:bg-brand-900/10' : ''}`}>
                  <td className="table-td w-10">
                    <input
                      type="checkbox"
                      checked={selected.has(m.id)}
                      onChange={() => toggleOne(m.id)}
                      className="h-4 w-4 rounded border-stone-300 accent-brand-600"
                    />
                  </td>
                  <td className="table-td font-medium text-stone-900 dark:text-slate-100">
                    <span className="inline-flex items-center gap-1.5">
                      {m.aluno.nome}
                      <ResponsavelInfo resp={m.aluno.responsavelFinanceiro} />
                    </span>
                  </td>
                  {visibleColumns.has('tipo') && (
                    <td className="table-td text-xs">
                      {m.tipo === 'OFICINA' && m.oficinaNome ? (
                        <span className="group relative inline-block max-w-[9rem]">
                          <span className="block truncate rounded-full bg-violet-100 px-2 py-0.5 font-semibold text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                            {m.oficinaNome}
                          </span>
                          <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 w-max max-w-[16rem] -translate-x-1/2 break-words rounded-lg bg-stone-800 px-2.5 py-1.5 text-center text-[11px] font-medium leading-snug text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:bg-slate-700">
                            {m.oficinaNome}
                          </span>
                        </span>
                      ) : (
                        <span className="text-stone-400 dark:text-slate-500">Mensalidade</span>
                      )}
                    </td>
                  )}
                  {visibleColumns.has('turno') && <td className="table-td text-xs text-stone-500 dark:text-slate-400">{TURNO_LABEL[m.aluno.turno] ?? m.aluno.turno}</td>}
                  {visibleColumns.has('referencia') && <td className="table-td text-xs">{formatMesAno(m.mesReferencia, m.anoReferencia)}</td>}
                  {visibleColumns.has('vencimento') && <td className="table-td text-xs">{formatDate(m.dataVencimento)}</td>}
                  {visibleColumns.has('status') && (
                    <td className="table-td">
                      <span className={STATUS_BADGE[m.status]}>{STATUS_LABEL[m.status]}</span>
                    </td>
                  )}
                  {visibleColumns.has('valor') && (
                    <td className="table-td text-right text-sm font-semibold text-stone-800 dark:text-slate-200">
                      {formatCurrency(m.valorOriginal - m.valorDesconto)}
                    </td>
                  )}
                  {visibleColumns.has('pago') && (
                    <td className="table-td text-right text-sm">
                      {m.valorPago !== null ? (
                        <span className="font-semibold text-forest-500 dark:text-forest-300">{formatCurrency(m.valorPago)}</span>
                      ) : (
                        <span className="text-stone-300 dark:text-slate-600">—</span>
                      )}
                    </td>
                  )}
                  <td className="table-td">
                    <div className="flex items-center justify-end gap-2">
                      {canAtendente && (m.status === 'PENDENTE' || m.status === 'INADIMPLENTE' || m.status === 'PARCIAL') && (
                        <button
                          onClick={() => {
                            const saldoRaw = m.status === 'PARCIAL'
                              ? Math.max(0, m.valorOriginal - m.valorDesconto - (m.valorPago ?? 0))
                              : m.valorOriginal - m.valorDesconto;
                            const saldo = parseFloat(saldoRaw.toFixed(2));
                            setModalPagar(m);
                            setServerError(null);
                            formPagar.reset({ splits: [{ formaPagamento: '', valor: saldo }], dataPagamento: hoje, valorDesconto: 0 });
                          }}
                          className="btn-secondary py-1 text-xs"
                        >
                          {m.status === 'PARCIAL' ? 'Complementar' : 'Pagar'}
                        </button>
                      )}
                      {canGerente && (m.status === 'PENDENTE' || m.status === 'INADIMPLENTE') && (
                        <button
                          onClick={() => { setModalCancelar(m); setServerError(null); formCancelar.reset(); }}
                          className="rounded-lg px-2 py-1 text-xs text-crimson-500 hover:bg-crimson-50 dark:hover:bg-crimson-900/20"
                        >
                          Cancelar
                        </button>
                      )}
                      {(m.status === 'PAGO' || m.status === 'PARCIAL') && (
                        <div className="flex items-center gap-2">
                          {m.status === 'PAGO' && m.dataPagamento && (
                            <span className="text-xs text-stone-400 dark:text-slate-500">
                              {formatDate(m.dataPagamento)} · {m.formaPagamento}
                            </span>
                          )}
                          {m.status === 'PARCIAL' && (
                            <span className="text-xs text-stone-400 dark:text-slate-500">
                              {formatCurrency(m.valorPago ?? 0)} de {formatCurrency(m.valorOriginal - m.valorDesconto)}
                            </span>
                          )}
                          {canGerente && (
                            <button
                              onClick={() => { setModalEstornar(m); setServerError(null); formEstornar.reset(); }}
                              className="rounded-lg px-2 py-1 text-xs text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20"
                            >
                              Estornar
                            </button>
                          )}
                        </div>
                      )}
                      {m.status === 'CANCELADA' && (
                        <MotivoTooltip motivo={m.motivoCancelamento} />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}



      {/* Modal: Cancelar em lote */}
      {bulkCancelarItems.length > 0 && (
        <Modal
          title={`Cancelar ${bulkCancelarItems.length} mensalidade${bulkCancelarItems.length !== 1 ? 's' : ''}`}
          onClose={() => { setBulkCancelarItems([]); setBulkCancelarIndividual(false); setServerError(null); }}
        >
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-crimson-200 bg-crimson-50 px-4 py-3 text-sm text-crimson-700 dark:border-crimson-700/40 dark:bg-crimson-700/10 dark:text-crimson-300">
            <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" clipRule="evenodd" />
            </svg>
            <span>
              Cancelando <strong>{bulkCancelarItems.length} mensalidade{bulkCancelarItems.length !== 1 ? 's' : ''}</strong>. Esta ação não pode ser desfeita.
            </span>
          </div>

          {/* Toggle motivos individuais — só exibido com 2+ itens */}
          {bulkCancelarItems.length > 1 && (
            <label className="mb-4 flex cursor-pointer items-center gap-3 rounded-xl border border-stone-200 px-4 py-3 transition-colors hover:bg-stone-50 dark:border-slate-700 dark:hover:bg-white/[0.08]">
              <input
                type="checkbox"
                checked={bulkCancelarIndividual}
                onChange={(e) => { setBulkCancelarIndividual(e.target.checked); setServerError(null); }}
                className="h-4 w-4 rounded border-stone-300 accent-brand-600"
              />
              <div>
                <p className="text-sm font-medium text-stone-800 dark:text-slate-200">Motivos diferentes por item</p>
                <p className="text-xs text-stone-400 dark:text-slate-500">Defina um motivo específico para cada mensalidade</p>
              </div>
            </label>
          )}

          <div className="space-y-4">
            {/* Motivo único */}
            {!bulkCancelarIndividual && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-slate-400">
                  Motivo do cancelamento <span className="text-crimson-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={bulkCancelarMotivoGlobal}
                  onChange={(e) => { setBulkCancelarMotivoGlobal(e.target.value); setServerError(null); }}
                  className="input-base resize-none"
                  placeholder="Obrigatório — será aplicado a todas as mensalidades…"
                />
              </div>
            )}

            {/* Motivos individuais */}
            {bulkCancelarIndividual && (
              <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
                {bulkCancelarItems.map((item) => (
                  <div key={item.id} className="rounded-xl border border-stone-100 p-3 dark:border-slate-800">
                    <p className="mb-1.5 text-xs font-semibold text-stone-700 dark:text-slate-300">
                      {item.nome} <span className="font-normal text-stone-400 dark:text-slate-500">· {item.ref}</span>
                    </p>
                    <textarea
                      rows={2}
                      value={bulkCancelarMotivos[item.id] ?? ''}
                      onChange={(e) => {
                        setBulkCancelarMotivos((prev) => ({ ...prev, [item.id]: e.target.value }));
                        setServerError(null);
                      }}
                      className="input-base resize-none text-xs"
                      placeholder="Motivo do cancelamento…"
                    />
                  </div>
                ))}
              </div>
            )}

            {serverError && <p className="text-xs text-crimson-500">{serverError}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setBulkCancelarItems([]); setBulkCancelarIndividual(false); setServerError(null); }}
                className="btn-secondary flex-1"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => { setServerError(null); submitBulkCancelar(); }}
                disabled={mutBulkCancelar.isPending}
                className="flex-1 rounded-xl bg-crimson-500 px-4 py-2 text-sm font-semibold text-white hover:bg-crimson-600 disabled:opacity-40"
              >
                {mutBulkCancelar.isPending ? 'Cancelando…' : `Cancelar ${bulkCancelarItems.length} mensalidade${bulkCancelarItems.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Estornar em lote */}
      {bulkEstornarItems.length > 0 && (
        <Modal
          title={`Estornar ${bulkEstornarItems.length} pagamento${bulkEstornarItems.length !== 1 ? 's' : ''}`}
          onClose={() => { setBulkEstornarItems([]); setBulkEstornarIndividual(false); setServerError(null); }}
        >
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-700/40 dark:bg-amber-700/10 dark:text-amber-300">
            <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" clipRule="evenodd" />
            </svg>
            <span>
              Revertendo <strong>{bulkEstornarItems.length} pagamento{bulkEstornarItems.length !== 1 ? 's' : ''}</strong> para <strong>Pendente</strong>.
            </span>
          </div>

          {/* Toggle motivos individuais — só exibido com 2+ itens */}
          {bulkEstornarItems.length > 1 && <label className="mb-4 flex cursor-pointer items-center gap-3 rounded-xl border border-stone-200 px-4 py-3 transition-colors hover:bg-stone-50 dark:border-slate-700 dark:hover:bg-white/[0.08]">
            <input
              type="checkbox"
              checked={bulkEstornarIndividual}
              onChange={(e) => { setBulkEstornarIndividual(e.target.checked); setServerError(null); }}
              className="h-4 w-4 rounded border-stone-300 accent-brand-600"
            />
            <div>
              <p className="text-sm font-medium text-stone-800 dark:text-slate-200">Motivos diferentes por item</p>
              <p className="text-xs text-stone-400 dark:text-slate-500">Defina um motivo específico para cada pagamento</p>
            </div>
          </label>}

          <div className="space-y-4">
            {/* Motivo único */}
            {!bulkEstornarIndividual && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-slate-400">
                  Motivo do estorno <span className="text-crimson-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={bulkEstornarMotivoGlobal}
                  onChange={(e) => { setBulkEstornarMotivoGlobal(e.target.value); setServerError(null); }}
                  className="input-base resize-none"
                  placeholder="Obrigatório — será aplicado a todos os pagamentos…"
                />
              </div>
            )}

            {/* Motivos individuais */}
            {bulkEstornarIndividual && (
              <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
                {bulkEstornarItems.map((item) => (
                  <div key={item.id} className="rounded-xl border border-stone-100 p-3 dark:border-slate-800">
                    <p className="mb-1.5 text-xs font-semibold text-stone-700 dark:text-slate-300">
                      {item.nome} <span className="font-normal text-stone-400 dark:text-slate-500">· {item.ref}</span>
                    </p>
                    <textarea
                      rows={2}
                      value={bulkEstornarMotivos[item.id] ?? ''}
                      onChange={(e) => {
                        setBulkEstornarMotivos((prev) => ({ ...prev, [item.id]: e.target.value }));
                        setServerError(null);
                      }}
                      className="input-base resize-none text-xs"
                      placeholder="Motivo do estorno…"
                    />
                  </div>
                ))}
              </div>
            )}

            {serverError && <p className="text-xs text-crimson-500">{serverError}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setBulkEstornarItems([]); setBulkEstornarIndividual(false); setServerError(null); }}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => { setServerError(null); submitBulkEstornar(); }}
                disabled={mutBulkEstornar.isPending}
                className="flex-1 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-40"
              >
                {mutBulkEstornar.isPending ? 'Estornando…' : `Confirmar ${bulkEstornarItems.length} estorno${bulkEstornarItems.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Gerar mensalidade */}
      {modalGerar && (
        <Modal title="Gerar Mensalidade" onClose={() => { setModalGerar(false); formGerar.reset(); setServerError(null); }}>
          <form onSubmit={formGerar.handleSubmit((d) => { setServerError(null); mutGerar.mutate(d); })} noValidate className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-slate-400">Aluno</label>
              <AlunoCombobox
                alunos={alunos}
                value={formGerar.watch('alunoId') ?? ''}
                onChange={(id) => formGerar.setValue('alunoId', id, { shouldValidate: true })}
                error={formGerar.formState.errors.alunoId?.message}
              />
              {formGerar.formState.errors.alunoId && (
                <p className="mt-1 text-xs text-crimson-500">{formGerar.formState.errors.alunoId.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-slate-400">Mês</label>
                <select {...formGerar.register('mesReferencia', { valueAsNumber: true })} className="input-base">
                  {MESES.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-slate-400">Ano</label>
                <YearPicker
                  value={formGerar.watch('anoReferencia') ?? now.getFullYear()}
                  onChange={(y) => formGerar.setValue('anoReferencia', y, { shouldValidate: true })}
                />
              </div>
            </div>
            {serverError && (
              <div className="flex items-start gap-2 rounded-xl border border-crimson-200 bg-crimson-50 px-4 py-3 text-sm text-crimson-600 dark:border-crimson-700/40 dark:bg-crimson-700/10 dark:text-crimson-300">
                {serverError}
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={mutGerar.isPending} className="btn-primary flex-1">
                {mutGerar.isPending ? 'Gerando…' : 'Gerar'}
              </button>
              <button type="button" onClick={() => { setModalGerar(false); formGerar.reset(); setServerError(null); }} className="btn-secondary">
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Registrar pagamento */}
      {modalPagar && (() => {
        const isParcial = modalPagar.status === 'PARCIAL';
        const descontoJaAplicado = isParcial ? (modalPagar.valorDesconto ?? 0) : 0;
        const valorLiquido = modalPagar.valorOriginal - descontoJaAplicado;
        const totalJaPago = modalPagar.valorPago ?? 0;
        const saldoDevedor = valorLiquido - totalJaPago;
        const splitsWatch = formPagar.watch('splits') ?? [];
        const descontoWatch = isParcial ? 0 : (formPagar.watch('valorDesconto') ?? 0);
        const totalNovosPagamentos = splitsWatch.reduce((acc, s) => acc + (Number(s.valor) || 0), 0);
        const novoTotalPago = totalJaPago + totalNovosPagamentos;
        const valorLiquidoComDesconto = modalPagar.valorOriginal - descontoJaAplicado - (isParcial ? 0 : descontoWatch);
        const novoStatus = novoTotalPago >= valorLiquidoComDesconto ? 'PAGO' : 'PARCIAL';

        const posicaoFila = pagarFilaTotal > 1 ? pagarFilaTotal - pagarFila.length + 1 : 0;
        const tituloModal = pagarFilaTotal > 1
          ? `${isParcial ? 'Complementar' : 'Registrar pagamento'} — ${modalPagar.aluno.nome} (${posicaoFila} de ${pagarFilaTotal})`
          : `${isParcial ? 'Complementar pagamento' : 'Registrar pagamento'} — ${modalPagar.aluno.nome}`;

        return (
          <Modal
            title={tituloModal}
            onClose={() => { setPagarFila([]); setPagarFilaTotal(0); setModalPagar(null); formPagar.reset({ splits: [{ formaPagamento: '', valor: 0 }], dataPagamento: hoje, valorDesconto: 0 }); setServerError(null); }}
          >
            <p className="mb-4 text-xs text-stone-400 dark:text-slate-500">
              Referência: {formatMesAno(modalPagar.mesReferencia, modalPagar.anoReferencia)} · Vencimento: {formatDate(modalPagar.dataVencimento)}
            </p>

            {/* Histórico de pagamentos parciais */}
            {isParcial && modalPagar.pagamentos && modalPagar.pagamentos.length > 0 && (
              <div className="mb-4 rounded-xl border border-brand-100 bg-brand-50 p-3 dark:border-brand-800/40 dark:bg-brand-900/10">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">Pagamentos realizados</p>
                <div className="space-y-1.5">
                  {modalPagar.pagamentos.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-xs">
                      <span className="text-stone-600 dark:text-slate-400">{p.formaPagamento} · {fmtBR(p.dataPagamento.slice(0, 10))}</span>
                      <span className="font-semibold text-forest-600 dark:text-forest-400">{formatCurrency(p.valor)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-brand-100 pt-2 dark:border-brand-800/40">
                  <span className="text-xs font-semibold text-stone-600 dark:text-slate-400">Saldo devedor</span>
                  <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{formatCurrency(saldoDevedor)}</span>
                </div>
              </div>
            )}

            <form
              onSubmit={formPagar.handleSubmit((d) => {
                setServerError(null);
                mutPagar.mutate({ id: modalPagar.id, data: d });
              })}
              noValidate
              className="space-y-4"
            >
              {/* Splits de pagamento */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-slate-400">
                  Formas de pagamento
                </label>
                <div className="space-y-2">
                  {splitFields.map((field, idx) => (
                    <div key={field.id} className="flex items-start gap-2">
                      <div className="flex-1">
                        <select
                          {...formPagar.register(`splits.${idx}.formaPagamento`)}
                          className={`input-base ${formPagar.formState.errors.splits?.[idx]?.formaPagamento ? 'input-error' : ''}`}
                        >
                          <option value="">Selecione…</option>
                          {FORMAS_PAGAMENTO.map((f) => <option key={f} value={f}>{f}</option>)}
                        </select>
                        {formPagar.formState.errors.splits?.[idx]?.formaPagamento && (
                          <p className="mt-0.5 text-xs text-crimson-500">{formPagar.formState.errors.splits[idx]?.formaPagamento?.message}</p>
                        )}
                      </div>
                      <div className="w-32">
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="R$ 0,00"
                          {...formPagar.register(`splits.${idx}.valor`, { valueAsNumber: true })}
                          onBlur={(e) => {
                            const v = parseFloat(e.target.value);
                            if (!isNaN(v)) {
                              formPagar.setValue(`splits.${idx}.valor`, parseFloat(v.toFixed(2)), { shouldValidate: true });
                            }
                          }}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const parts = raw.split('.');
                            if (parts[1] && parts[1].length > 2) {
                              e.target.value = `${parts[0]}.${parts[1].slice(0, 2)}`;
                            }
                          }}
                          className={`input-base ${formPagar.formState.errors.splits?.[idx]?.valor ? 'input-error' : ''}`}
                        />
                        {formPagar.formState.errors.splits?.[idx]?.valor && (
                          <p className="mt-0.5 text-xs text-crimson-500">{formPagar.formState.errors.splits[idx]?.valor?.message}</p>
                        )}
                      </div>
                      {splitFields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSplit(idx)}
                          className="mt-2 rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-crimson-500 dark:hover:bg-white/[0.1]"
                        >
                          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => appendSplit({ formaPagamento: '', valor: 0 })}
                  className="mt-2 flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5z" />
                  </svg>
                  Adicionar forma de pagamento
                </button>
              </div>

              {/* Desconto — apenas no primeiro pagamento */}
              {!isParcial && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-slate-400">Desconto (R$)</label>
                  <input type="number" step="0.01" min="0" {...formPagar.register('valorDesconto', { valueAsNumber: true })} className="input-base" />
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-slate-400">Data do pagamento</label>
                <Controller
                  control={formPagar.control}
                  name="dataPagamento"
                  render={({ field }) => (
                    <DatePickerInput
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      hasError={!!formPagar.formState.errors.dataPagamento}
                      placeholder="Selecione a data"
                    />
                  )}
                />
                {formPagar.formState.errors.dataPagamento && <p className="mt-1 text-xs text-crimson-500">{formPagar.formState.errors.dataPagamento.message}</p>}
              </div>

              {/* Resumo em tempo real */}
              {totalNovosPagamentos > 0 && (
                <div className="rounded-xl border border-stone-100 bg-stone-50 px-4 py-3 dark:border-slate-700 dark:bg-white/[0.06]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-500 dark:text-slate-400">Total a registrar agora</span>
                    <span className="font-semibold text-stone-800 dark:text-slate-200">{formatCurrency(totalNovosPagamentos)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="text-stone-500 dark:text-slate-400">Status após confirmação</span>
                    <span className={`font-semibold ${novoStatus === 'PAGO' ? 'text-forest-600 dark:text-forest-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {novoStatus === 'PAGO' ? '✓ Pago' : '◑ Parcial'}
                    </span>
                  </div>
                </div>
              )}

              {serverError && (
                <div className="flex items-start gap-2 rounded-xl border border-crimson-200 bg-crimson-50 px-4 py-3 text-sm text-crimson-600 dark:border-crimson-700/40 dark:bg-crimson-700/10 dark:text-crimson-300">
                  {serverError}
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={mutPagar.isPending} className="btn-primary flex-1">
                  {mutPagar.isPending ? 'Registrando…' : 'Confirmar pagamento'}
                </button>
                <button type="button" onClick={() => { setPagarFila([]); setPagarFilaTotal(0); setModalPagar(null); formPagar.reset({ splits: [{ formaPagamento: '', valor: 0 }], dataPagamento: hoje, valorDesconto: 0 }); setServerError(null); }} className="btn-secondary">
                  {pagarFilaTotal > 1 ? 'Cancelar fila' : 'Cancelar'}
                </button>
              </div>
            </form>
          </Modal>
        );
      })()}

      {/* Modal: Estornar pagamento (GERENTE+) */}
      {modalEstornar && (
        <Modal
          title={`Estornar pagamento — ${modalEstornar.aluno.nome}`}
          onClose={() => { setModalEstornar(null); formEstornar.reset(); setServerError(null); }}
        >
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-700/40 dark:bg-amber-700/10 dark:text-amber-300">
            <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" clipRule="evenodd" />
            </svg>
            <span>
              Esta ação irá desfazer o pagamento e retornar a mensalidade para <strong>Pendente</strong>.
              Referência: <strong>{modalEstornar && `${MESES[modalEstornar.mesReferencia]}/${modalEstornar.anoReferencia}`}</strong>
              {modalEstornar.valorPago !== null && <> · Valor pago: <strong>{formatCurrency(modalEstornar.valorPago)}</strong></>}
            </span>
          </div>
          <form
            onSubmit={formEstornar.handleSubmit((d) => { setServerError(null); mutEstornar.mutate({ id: modalEstornar.id, data: d }); })}
            noValidate
            className="space-y-4"
          >
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-slate-400">
                Motivo do estorno <span className="text-crimson-500">*</span>
              </label>
              <textarea
                {...formEstornar.register('motivoEstorno')}
                rows={3}
                placeholder="Ex: pagamento lançado em duplicidade, valor incorreto…"
                className={`input-base resize-none ${formEstornar.formState.errors.motivoEstorno ? 'input-error' : ''}`}
              />
              {formEstornar.formState.errors.motivoEstorno && (
                <p className="mt-1 text-xs text-crimson-500">{formEstornar.formState.errors.motivoEstorno.message}</p>
              )}
            </div>
            {serverError && (
              <p className="text-xs text-crimson-500">{serverError}</p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setModalEstornar(null); formEstornar.reset(); setServerError(null); }}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={mutEstornar.isPending}
                className="flex-1 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-600 disabled:opacity-40"
              >
                {mutEstornar.isPending ? 'Estornando…' : 'Confirmar estorno'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Cancelar (GERENTE+) */}
      {modalCancelar && (
        <Modal title={`Cancelar — ${modalCancelar.aluno.nome}`} onClose={() => { setModalCancelar(null); formCancelar.reset(); setServerError(null); }}>
          <p className="mb-4 text-xs text-stone-400 dark:text-slate-500">
            Referência: {formatMesAno(modalCancelar.mesReferencia, modalCancelar.anoReferencia)}
          </p>
          <form onSubmit={formCancelar.handleSubmit((d) => { setServerError(null); mutCancelar.mutate({ id: modalCancelar.id, data: d }); })} noValidate className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-slate-400">
                Motivo do cancelamento <span className="text-crimson-500">*</span>
              </label>
              <textarea
                rows={3}
                {...formCancelar.register('motivoCancelamento')}
                className={`input-base resize-none ${formCancelar.formState.errors.motivoCancelamento ? 'input-error' : ''}`}
                placeholder="Obrigatório — descreva o motivo do cancelamento…"
              />
              {formCancelar.formState.errors.motivoCancelamento && <p className="mt-1 text-xs text-crimson-500">{formCancelar.formState.errors.motivoCancelamento.message}</p>}
            </div>
            {serverError && (
              <div className="flex items-start gap-2 rounded-xl border border-crimson-200 bg-crimson-50 px-4 py-3 text-sm text-crimson-600 dark:border-crimson-700/40 dark:bg-crimson-700/10 dark:text-crimson-300">
                {serverError}
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={mutCancelar.isPending} className="btn-primary flex-1 bg-crimson-500 hover:bg-crimson-600">
                {mutCancelar.isPending ? 'Cancelando…' : 'Confirmar cancelamento'}
              </button>
              <button type="button" onClick={() => { setModalCancelar(null); formCancelar.reset(); setServerError(null); }} className="btn-secondary">
                Voltar
              </button>
            </div>
          </form>
        </Modal>
      )}

      <Toast toast={toast} onClose={hideToast} />
    </div>
  );
}

export default function MensalidadesPage() {
  return (
    <Suspense>
      <MensalidadesContent />
    </Suspense>
  );
}
