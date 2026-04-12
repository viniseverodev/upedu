// Utilitários globais do frontend

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// shadcn/ui helper para merge de classes Tailwind
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Formatar moeda BRL
export function formatCurrency(value: number | string): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value));
}

// Formatar data pt-BR
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
}

// Formatar mês/ano de referência
export function formatMesAno(mes: number, ano: number): string {
  return `${String(mes).padStart(2, '0')}/${ano}`;
}
