'use client';

// CalendarRangePicker — seletor de intervalo de datas com drill-down mês/ano
// Componente compartilhado para filtros de período em todas as telas

import { useState } from 'react';
import { createPortal } from 'react-dom';

// ---------- Constantes ----------

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const DAY_NAMES = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

type CalendarView = 'day' | 'month' | 'year';

// ---------- Helpers ----------

function pad2(n: number) { return String(n).padStart(2, '0'); }
function toDateStr(y: number, m: number, d: number) {
  return `${y}-${pad2(m + 1)}-${pad2(d)}`;
}
export function fmtBR(s: string) {
  if (!s) return '—';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}
function todayStr() {
  const d = new Date();
  return toDateStr(d.getFullYear(), d.getMonth(), d.getDate());
}
function offsetDate(from: string, days: number) {
  const d = new Date(from + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return toDateStr(d.getFullYear(), d.getMonth(), d.getDate());
}

// ---------- Atalhos padrão ----------

function defaultShortcuts(t: string, today: Date) {
  const cy = today.getFullYear();
  const cm = today.getMonth();
  const nm = cm === 11 ? 0 : cm + 1;
  const ny = cm === 11 ? cy + 1 : cy;
  const daysThisMonth = new Date(cy, cm + 1, 0).getDate();
  const daysPrevMonth = new Date(cy, cm, 0).getDate();
  const prevM = cm === 0 ? 11 : cm - 1;
  const prevY = cm === 0 ? cy - 1 : cy;
  const daysNextMonth = new Date(ny, nm + 1, 0).getDate();

  return [
    { label: '7 dias',       ini: t, fim: offsetDate(t, 6) },
    { label: '15 dias',      ini: t, fim: offsetDate(t, 14) },
    { label: 'Este mês',     ini: `${cy}-${pad2(cm + 1)}-01`, fim: `${cy}-${pad2(cm + 1)}-${pad2(daysThisMonth)}` },
    { label: 'Mês passado',  ini: `${prevY}-${pad2(prevM + 1)}-01`, fim: `${prevY}-${pad2(prevM + 1)}-${pad2(daysPrevMonth)}` },
    { label: 'Mês que vem',  ini: `${ny}-${pad2(nm + 1)}-01`, fim: `${ny}-${pad2(nm + 1)}-${pad2(daysNextMonth)}` },
    { label: 'Ano atual',    ini: `${cy}-01-01`, fim: `${cy}-12-31` },
  ];
}

// ---------- Props ----------

interface CalendarRangePickerProps {
  title?: string;
  initialInicio: string;
  initialFim: string;
  onApply: (inicio: string, fim: string) => void;
  onClose: () => void;
  showShortcuts?: boolean;
}

// ---------- Componente ----------

export function CalendarRangePicker({
  title = 'Selecionar período',
  initialInicio,
  initialFim,
  onApply,
  onClose,
  showShortcuts = true,
}: CalendarRangePickerProps) {
  const today = new Date();
  const cy = today.getFullYear();
  const cm = today.getMonth();
  const t = todayStr();

  const [viewMode, setViewMode] = useState<CalendarView>('day');
  const [viewYear, setViewYear] = useState(initialInicio ? parseInt(initialInicio.slice(0, 4)) : cy);
  const [viewMonth, setViewMonth] = useState(initialInicio ? parseInt(initialInicio.slice(5, 7)) - 1 : cm);
  const [yearPage, setYearPage] = useState(Math.floor((initialInicio ? parseInt(initialInicio.slice(0, 4)) : cy) / 12) * 12);
  const [start, setStart] = useState(initialInicio);
  const [end, setEnd] = useState(initialFim);
  const [hovered, setHovered] = useState('');

  const shortcuts = defaultShortcuts(t, today);

  function handleDayClick(d: string) {
    if (!start || (start && end)) { setStart(d); setEnd(''); }
    else if (d < start) { setEnd(start); setStart(d); }
    else setEnd(d);
  }

  function inRange(d: string) {
    const e = end || hovered;
    if (!start || !e) return false;
    const [lo, hi] = start <= e ? [start, e] : [e, start];
    return d > lo && d < hi;
  }

  function prevNav() {
    if (viewMode === 'day') {
      if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
      else setViewMonth((m) => m - 1);
    } else if (viewMode === 'month') {
      setViewYear((y) => y - 1);
    } else {
      setYearPage((p) => p - 12);
    }
  }

  function nextNav() {
    if (viewMode === 'day') {
      if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
      else setViewMonth((m) => m + 1);
    } else if (viewMode === 'month') {
      setViewYear((y) => y + 1);
    } else {
      setYearPage((p) => p + 12);
    }
  }

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const years = Array.from({ length: 12 }, (_, i) => yearPage + i);
  const canApply = !!(start && end);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-80 rounded-2xl border border-stone-200 bg-white p-5 shadow-2xl dark:border-slate-700/60 dark:bg-[#0c0e14]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Título + fechar */}
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-stone-900 dark:text-slate-100">{title}</p>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:text-slate-500 dark:hover:bg-white/[0.1] dark:hover:text-slate-300"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Atalhos rápidos */}
        {showShortcuts && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {shortcuts.map((s) => (
              <button
                key={s.label}
                onClick={() => { setStart(s.ini); setEnd(s.fim); setViewMode('day'); }}
                className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
                  start === s.ini && end === s.fim
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-stone-200 text-stone-500 hover:border-brand-400 hover:text-brand-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-brand-500 dark:hover:text-brand-400'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* Navegação */}
        <div className="mb-3 flex items-center justify-between">
          <button
            onClick={prevNav}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:text-slate-500 dark:hover:bg-white/[0.1] dark:hover:text-slate-200"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>

          <div className="flex items-center gap-1">
            {viewMode === 'day' && (
              <>
                <button
                  onClick={() => setViewMode('month')}
                  className="rounded px-1 text-sm font-semibold text-stone-800 hover:text-brand-600 dark:text-slate-200 dark:hover:text-brand-400"
                >
                  {MONTH_NAMES[viewMonth]}
                </button>
                <button
                  onClick={() => setViewMode('year')}
                  className="rounded px-1 text-sm font-semibold text-stone-800 hover:text-brand-600 dark:text-slate-200 dark:hover:text-brand-400"
                >
                  {viewYear}
                </button>
              </>
            )}
            {viewMode === 'month' && (
              <button
                onClick={() => setViewMode('year')}
                className="rounded px-1 text-sm font-semibold text-stone-800 hover:text-brand-600 dark:text-slate-200 dark:hover:text-brand-400"
              >
                {viewYear}
              </button>
            )}
            {viewMode === 'year' && (
              <span className="text-sm font-semibold text-stone-800 dark:text-slate-200">
                {yearPage} – {yearPage + 11}
              </span>
            )}
          </div>

          <button
            onClick={nextNav}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:text-slate-500 dark:hover:bg-white/[0.1] dark:hover:text-slate-200"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>

        {/* View: Dias */}
        {viewMode === 'day' && (
          <div className="grid grid-cols-7 text-center text-xs">
            {DAY_NAMES.map((d, i) => (
              <div key={i} className="py-1.5 font-semibold text-stone-400 dark:text-slate-500">{d}</div>
            ))}
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const d = toDateStr(viewYear, viewMonth, day);
              const isSelected = d === start || d === end;
              const ranged = inRange(d);
              const isToday = d === t;
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
                        : isToday
                          ? 'rounded-full font-bold text-brand-600 dark:text-brand-400'
                          : 'rounded-full text-stone-700 hover:bg-stone-100 dark:text-slate-300 dark:hover:bg-white/[0.1]',
                  ].join(' ')}
                >
                  {day}
                </button>
              );
            })}
          </div>
        )}

        {/* View: Meses */}
        {viewMode === 'month' && (
          <div className="grid grid-cols-3 gap-1.5">
            {MONTH_NAMES.map((name, i) => (
              <button
                key={i}
                onClick={() => { setViewMonth(i); setViewMode('day'); }}
                className={`rounded-lg py-2.5 text-xs font-medium transition-colors ${
                  i === viewMonth
                    ? 'bg-brand-600 text-white'
                    : 'text-stone-700 hover:bg-stone-100 dark:text-slate-300 dark:hover:bg-white/[0.1]'
                }`}
              >
                {name.slice(0, 3)}
              </button>
            ))}
          </div>
        )}

        {/* View: Anos */}
        {viewMode === 'year' && (
          <div className="grid grid-cols-3 gap-1.5">
            {years.map((y) => (
              <button
                key={y}
                onClick={() => { setViewYear(y); setYearPage(Math.floor(y / 12) * 12); setViewMode('month'); }}
                className={`rounded-lg py-2.5 text-xs font-medium transition-colors ${
                  y === viewYear
                    ? 'bg-brand-600 text-white'
                    : 'text-stone-700 hover:bg-stone-100 dark:text-slate-300 dark:hover:bg-white/[0.1]'
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        )}

        {/* Resumo seleção */}
        <div className="mt-4 flex items-center justify-between rounded-xl bg-stone-50 px-3 py-2 text-xs dark:bg-white/[0.06]">
          <span className="text-stone-500 dark:text-slate-400">
            De <strong className="text-stone-800 dark:text-slate-100">{fmtBR(start)}</strong>
          </span>
          <span className="text-stone-300 dark:text-slate-600">→</span>
          <span className="text-stone-500 dark:text-slate-400">
            Até <strong className="text-stone-800 dark:text-slate-100">{fmtBR(end)}</strong>
          </span>
        </div>

        {/* Ações */}
        <div className="mt-3 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-600 transition-colors hover:bg-stone-50 dark:border-slate-700/60 dark:bg-white/[0.06] dark:text-slate-300 dark:hover:bg-white/[0.1]"
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
    </div>,
    document.body,
  );
}
