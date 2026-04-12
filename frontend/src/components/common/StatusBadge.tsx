// StatusBadge — badge colorido por status
// Usado em: lista de alunos, mensalidades, matrículas

import { cn } from '@/lib/utils';
import type { AlunoStatus, MensalidadeStatus } from '@/types';

type Status = AlunoStatus | MensalidadeStatus;

const STATUS_STYLES: Record<Status, string> = {
  ATIVO: 'bg-green-100 text-green-800',
  PRE_MATRICULA: 'bg-blue-100 text-blue-800',
  INATIVO: 'bg-gray-100 text-gray-800',
  LISTA_ESPERA: 'bg-yellow-100 text-yellow-800',
  TRANSFERIDO: 'bg-purple-100 text-purple-800',
  PENDENTE: 'bg-yellow-100 text-yellow-800',
  PAGO: 'bg-green-100 text-green-800',
  INADIMPLENTE: 'bg-red-100 text-red-800',
  CANCELADA: 'bg-gray-100 text-gray-800',
};

const STATUS_LABELS: Record<Status, string> = {
  ATIVO: 'Ativo',
  PRE_MATRICULA: 'Pré-matrícula',
  INATIVO: 'Inativo',
  LISTA_ESPERA: 'Lista de espera',
  TRANSFERIDO: 'Transferido',
  PENDENTE: 'Pendente',
  PAGO: 'Pago',
  INADIMPLENTE: 'Inadimplente',
  CANCELADA: 'Cancelada',
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_STYLES[status])}>
      {STATUS_LABELS[status]}
    </span>
  );
}
