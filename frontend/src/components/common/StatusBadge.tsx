// StatusBadge — badge colorido por status
// Usado em: lista de alunos, mensalidades, matrículas

import type { AlunoStatus, MensalidadeStatus } from '@/types';

type Status = AlunoStatus | MensalidadeStatus;

const STATUS_CLASS: Record<Status, string> = {
  ATIVO: 'badge-green',
  PRE_MATRICULA: 'badge-blue',
  INATIVO: 'badge-gray',
  LISTA_ESPERA: 'badge-yellow',
  TRANSFERIDO: 'badge-purple',
  PENDENTE: 'badge-yellow',
  PARCIAL: 'badge-yellow',
  PAGO: 'badge-green',
  INADIMPLENTE: 'badge-red',
  CANCELADA: 'badge-gray',
};

const STATUS_LABELS: Record<Status, string> = {
  ATIVO: 'Ativo',
  PRE_MATRICULA: 'Pré-matrícula',
  INATIVO: 'Inativo',
  LISTA_ESPERA: 'Lista de espera',
  TRANSFERIDO: 'Transferido',
  PENDENTE: 'Pendente',
  PARCIAL: 'Parcial',
  PAGO: 'Pago',
  INADIMPLENTE: 'Inadimplente',
  CANCELADA: 'Cancelada',
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`badge ${STATUS_CLASS[status] ?? 'badge-gray'}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
