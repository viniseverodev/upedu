// DatePickerModal — seletor de data com 3 modos (dia → mês → ano)
// Permite navegar até anos distantes (ex: 1990) em poucos cliques.
// Usado em: alunos/novo, alunos/[id]/editar

'use client';

import { useState } from 'react';

// ── Constantes ──────────────────────────────────────────────────────────────
const MONTH_NAMES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];
const MONTH_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const DAY_NAMES = ['D','S','T','Q','Q','S','S'];

// ── Helpers ──────────────────────────────────────────────────────────────────
function pad2(n: number) { return String(n).padStart(2, '0'); }
function toDateStr(y: number, m: number, d: number) {
  return `${y}-${pad2(m + 1)}-${pad2(d)}`;
}

/** Converte "YYYY-MM-DD" → "DD/MM/YYYY" sem problemas de timezone. */
export function fmtDateBR(s: string): string {
  if (!s) return '';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

// ── Tipos ────────────────────────────────────────────────────────────────────
type DateViewMode = 'day' | 'month' | 'year';

interface DatePickerModalProps {
  value: string;           // "YYYY-MM-DD" ou vazio
  onSelect: (date: string) => void;
  onClose: () => void;
}

// ── Componente ───────────────────────────────────────────────────────────────
export function DatePickerModal({ value, onSelect, onClose }: DatePickerModalProps) {
  const today = new Date();
  const initYear  = value ? parseInt(value.split('-')[0]) : today.getFullYear();
  const initMonth = value ? parseInt(value.split('-')[1]) - 1 : today.getMonth();

  const [mode, setMode] = useState<DateViewMode>('day');
  const [viewYear,  setViewYear]  = useState(initYear);
  const [viewMonth, setViewMonth] = useState(initMonth);
  // Início da janela de 12 anos exibida no modo "ano"
  const [yearStart, setYearStart] = useState(Math.floor(initYear / 12) * 12);

  // ── Modo: DIA ──────────────────────────────────────────────────────────────
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  // ── Modo: MÊS ──────────────────────────────────────────────────────────────
  function selectMonth(m: number) { setViewMonth(m); setMode('day'); }

  // ── Modo: ANO ──────────────────────────────────────────────────────────────
  function selectYear(y: number) { setViewYear(y); setMode('month'); }

  // ── Classes reutilizáveis ──────────────────────────────────────────────────
  const navBtn   = 'rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition-colors';
  const headerBtn = 'flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-gray-800 hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors';

  const chevronLeft = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
    </svg>
  );
  const chevronRight = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  );
  const chevronDown = (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-gray-400">
      <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06z" clipRule="evenodd" />
    </svg>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-80 rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Título + fechar */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">Data de nascimento</p>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── MODO: DIA ─────────────────────────────────────────────────────── */}
        {mode === 'day' && (
          <>
            <div className="mb-3 flex items-center justify-between">
              <button onClick={prevMonth} className={navBtn}>{chevronLeft}</button>
              <button onClick={() => setMode('month')} className={headerBtn}>
                {MONTH_NAMES[viewMonth]} {viewYear}
                {chevronDown}
              </button>
              <button onClick={nextMonth} className={navBtn}>{chevronRight}</button>
            </div>

            <div className="grid grid-cols-7 text-center text-xs">
              {DAY_NAMES.map((d, i) => (
                <div key={i} className="py-1.5 font-semibold text-gray-400 dark:text-slate-500">{d}</div>
              ))}
              {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const d = toDateStr(viewYear, viewMonth, day);
                const isSelected = d === value;
                // Bloqueia datas futuras
                const isFuture = d > toDateStr(today.getFullYear(), today.getMonth(), today.getDate());
                return (
                  <button
                    key={day}
                    onClick={() => { if (!isFuture) { onSelect(d); onClose(); } }}
                    disabled={isFuture}
                    className={[
                      'py-1.5 text-xs font-medium transition-colors rounded-full',
                      isSelected
                        ? 'bg-brand-600 text-white'
                        : isFuture
                          ? 'text-gray-300 cursor-not-allowed dark:text-slate-600'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700',
                    ].join(' ')}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* ── MODO: MÊS ────────────────────────────────────────────────────── */}
        {mode === 'month' && (
          <>
            <div className="mb-3 flex items-center justify-between">
              <button onClick={() => setViewYear((y) => y - 1)} className={navBtn}>{chevronLeft}</button>
              <button
                onClick={() => { setYearStart(Math.floor(viewYear / 12) * 12); setMode('year'); }}
                className={headerBtn}
              >
                {viewYear}
                {chevronDown}
              </button>
              <button onClick={() => setViewYear((y) => y + 1)} className={navBtn}>{chevronRight}</button>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {MONTH_SHORT.map((m, i) => {
                const isSelected = value
                  ? parseInt(value.split('-')[0]) === viewYear && parseInt(value.split('-')[1]) - 1 === i
                  : false;
                return (
                  <button
                    key={m}
                    onClick={() => selectMonth(i)}
                    className={[
                      'rounded-xl py-2.5 text-sm font-medium transition-colors',
                      isSelected
                        ? 'bg-brand-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700',
                    ].join(' ')}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* ── MODO: ANO ────────────────────────────────────────────────────── */}
        {mode === 'year' && (
          <>
            <div className="mb-3 flex items-center justify-between">
              <button onClick={() => setYearStart((s) => s - 12)} className={navBtn}>{chevronLeft}</button>
              <span className="text-sm font-semibold text-gray-800 dark:text-slate-200">
                {yearStart} – {yearStart + 11}
              </span>
              <button onClick={() => setYearStart((s) => s + 12)} className={navBtn}>{chevronRight}</button>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {Array.from({ length: 12 }).map((_, i) => {
                const y = yearStart + i;
                const isSelected = value ? parseInt(value.split('-')[0]) === y : false;
                const isCurrent  = y === viewYear;
                const isFutureYear = y > today.getFullYear();
                return (
                  <button
                    key={y}
                    onClick={() => { if (!isFutureYear) selectYear(y); }}
                    disabled={isFutureYear}
                    className={[
                      'rounded-xl py-2.5 text-sm font-medium transition-colors',
                      isSelected
                        ? 'bg-brand-600 text-white'
                        : isFutureYear
                          ? 'text-gray-300 cursor-not-allowed dark:text-slate-600'
                          : isCurrent
                            ? 'border border-brand-400 text-brand-600 dark:border-brand-500 dark:text-brand-400'
                            : 'text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700',
                    ].join(' ')}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Limpar data */}
        {value && (
          <div className="mt-4 border-t border-gray-100 pt-3 dark:border-slate-800">
            <button
              onClick={() => { onSelect(''); onClose(); }}
              className="text-xs font-medium text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300"
            >
              Limpar data
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
