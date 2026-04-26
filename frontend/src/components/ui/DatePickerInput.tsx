'use client';

// DatePickerInput — seletor de data single com visual do projeto
// Substitui input[type="date"] nativo em todos os formulários

import { useState, useRef, useEffect } from 'react';

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
function fmtBR(s: string) {
  if (!s) return '';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}
function todayStr() {
  const d = new Date();
  return toDateStr(d.getFullYear(), d.getMonth(), d.getDate());
}

// ---------- Props ----------

interface DatePickerInputProps {
  value: string;                     // YYYY-MM-DD
  onChange: (val: string) => void;
  placeholder?: string;
  hasError?: boolean;
  className?: string;
  disabled?: boolean;
}

// ---------- Componente ----------

export function DatePickerInput({
  value,
  onChange,
  placeholder = 'Selecione uma data',
  hasError = false,
  className = '',
  disabled = false,
}: DatePickerInputProps) {
  const today = new Date();
  const cy = today.getFullYear();
  const cm = today.getMonth();

  const [open, setOpen] = useState(false);
  const [viewMode, setViewMode] = useState<CalendarView>('day');
  const [viewYear, setViewYear] = useState(value ? parseInt(value.slice(0, 4)) : cy);
  const [viewMonth, setViewMonth] = useState(value ? parseInt(value.slice(5, 7)) - 1 : cm);
  const [yearPage, setYearPage] = useState(Math.floor((value ? parseInt(value.slice(0, 4)) : cy) / 12) * 12);

  const wrapperRef = useRef<HTMLDivElement>(null);

  // Fechar ao clicar fora
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Sincronizar view com valor externo ao abrir
  function handleOpen() {
    if (disabled) return;
    if (value) {
      setViewYear(parseInt(value.slice(0, 4)));
      setViewMonth(parseInt(value.slice(5, 7)) - 1);
      setYearPage(Math.floor(parseInt(value.slice(0, 4)) / 12) * 12);
    } else {
      setViewYear(cy);
      setViewMonth(cm);
      setYearPage(Math.floor(cy / 12) * 12);
    }
    setViewMode('day');
    setOpen(true);
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

  function handleDayClick(d: string) {
    onChange(d);
    setOpen(false);
  }

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const years = Array.from({ length: 12 }, (_, i) => yearPage + i);
  const t = todayStr();

  return (
    <div ref={wrapperRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={handleOpen}
        className={[
          'input-base flex w-full items-center justify-between text-left',
          hasError ? 'input-error' : '',
          !value ? 'text-gray-400 dark:text-slate-500' : '',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
          className,
        ].filter(Boolean).join(' ')}
      >
        <span>{value ? fmtBR(value) : placeholder}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4 shrink-0 text-gray-400 dark:text-slate-500">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
        </svg>
      </button>

      {/* Dropdown calendário */}
      {open && (
        <div className="absolute z-50 mt-1.5 w-72 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900">

          {/* Navegação */}
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={prevNav}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>

            <div className="flex items-center gap-1">
              {viewMode === 'day' && (
                <>
                  <button
                    type="button"
                    onClick={() => setViewMode('month')}
                    className="rounded px-1 text-sm font-semibold text-gray-800 hover:text-brand-600 dark:text-slate-200 dark:hover:text-brand-400"
                  >
                    {MONTH_NAMES[viewMonth]}
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('year')}
                    className="rounded px-1 text-sm font-semibold text-gray-800 hover:text-brand-600 dark:text-slate-200 dark:hover:text-brand-400"
                  >
                    {viewYear}
                  </button>
                </>
              )}
              {viewMode === 'month' && (
                <button
                  type="button"
                  onClick={() => setViewMode('year')}
                  className="rounded px-1 text-sm font-semibold text-gray-800 hover:text-brand-600 dark:text-slate-200 dark:hover:text-brand-400"
                >
                  {viewYear}
                </button>
              )}
              {viewMode === 'year' && (
                <span className="text-sm font-semibold text-gray-800 dark:text-slate-200">
                  {yearPage} – {yearPage + 11}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={nextNav}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
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
                <div key={i} className="py-1.5 font-semibold text-gray-400 dark:text-slate-500">{d}</div>
              ))}
              {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const d = toDateStr(viewYear, viewMonth, day);
                const isSelected = d === value;
                const isToday = d === t;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleDayClick(d)}
                    className={[
                      'relative py-1.5 text-xs font-medium transition-colors rounded-full',
                      isSelected
                        ? 'bg-brand-600 text-white'
                        : isToday
                          ? 'text-brand-600 font-bold dark:text-brand-400'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700',
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
                  type="button"
                  onClick={() => { setViewMonth(i); setViewMode('day'); }}
                  className={`rounded-lg py-2.5 text-xs font-medium transition-colors ${
                    i === viewMonth
                      ? 'bg-brand-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700'
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
                  type="button"
                  onClick={() => { setViewYear(y); setYearPage(Math.floor(y / 12) * 12); setViewMode('month'); }}
                  className={`rounded-lg py-2.5 text-xs font-medium transition-colors ${
                    y === viewYear
                      ? 'bg-brand-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          )}

          {/* Rodapé: hoje + limpar */}
          <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-slate-700">
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false); }}
              className="text-xs font-medium text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={() => { handleDayClick(t); }}
              className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
            >
              Hoje
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
