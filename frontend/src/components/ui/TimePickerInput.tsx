'use client';

// TimePickerInput — seletor de horário com opções clicáveis + digitação manual
// Dropdown renderizado via portal para funcionar dentro de modais

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

// Gera slots de 30 em 30 minutos entre 05:00 e 23:30
const TIME_SLOTS: string[] = Array.from({ length: 38 }, (_, i) => {
  const total = 5 * 60 + i * 30;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
});

function formatHorario(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

interface TimePickerInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  hasError?: boolean;
  disabled?: boolean;
}

export function TimePickerInput({
  value,
  onChange,
  placeholder = '00:00',
  hasError = false,
  disabled = false,
}: TimePickerInputProps) {
  const [open, setOpen] = useState(false);
  const [inputVal, setInputVal] = useState(value);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  const wrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  // Sincronizar input com valor externo
  useEffect(() => { setInputVal(value); }, [value]);

  // Scroll para o item selecionado ao abrir
  useEffect(() => {
    if (open && selectedRef.current) {
      selectedRef.current.scrollIntoView({ block: 'center' });
    }
  }, [open]);

  // Fechar ao clicar fora
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!wrapperRef.current?.contains(t) && !dropdownRef.current?.contains(t)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  function handleFocus() {
    if (disabled) return;
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (rect) {
      const dropdownH = 224;
      const spaceBelow = window.innerHeight - rect.bottom;
      const top = spaceBelow >= dropdownH ? rect.bottom + 4 : rect.top - dropdownH - 4;
      setDropdownPos({ top, left: rect.left, width: rect.width });
    }
    setOpen(true);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatHorario(e.target.value);
    setInputVal(formatted);
    if (formatted.length === 5) onChange(formatted);
    else if (formatted === '') onChange('');
  }

  function handleBlur() {
    if (/^\d{2}:\d{2}$/.test(inputVal)) onChange(inputVal);
    else if (!inputVal) onChange('');
  }

  function selectTime(time: string) {
    setInputVal(time);
    onChange(time);
    setOpen(false);
  }

  const dropdown = open ? (
    <div
      ref={dropdownRef}
      style={{ top: dropdownPos.top, left: dropdownPos.left, width: Math.max(dropdownPos.width, 160) }}
      className="fixed z-[9999] max-h-56 overflow-y-auto rounded-xl border border-stone-200 bg-white py-1 shadow-2xl dark:border-slate-700/60 dark:bg-[#0c0e14]"
    >
      {TIME_SLOTS.map((t) => {
        const isSelected = t === value;
        return (
          <button
            key={t}
            ref={isSelected ? selectedRef : undefined}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => selectTime(t)}
            className={[
              'w-full px-4 py-2 text-left text-sm font-medium transition-colors',
              isSelected
                ? 'bg-brand-600 text-white'
                : 'text-stone-700 hover:bg-stone-50 dark:text-slate-300 dark:hover:bg-white/[0.06]',
            ].join(' ')}
          >
            {t}
          </button>
        );
      })}
    </div>
  ) : null;

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={inputVal}
        placeholder={placeholder}
        maxLength={5}
        disabled={disabled}
        onFocus={handleFocus}
        onChange={handleInputChange}
        onBlur={handleBlur}
        className={`input-base ${hasError ? 'input-error' : ''}`}
      />
      {typeof document !== 'undefined' && dropdown && createPortal(dropdown, document.body)}
    </div>
  );
}
