// Tipos TypeScript compartilhados no frontend
// Espelham os tipos do Prisma/backend para consistência

export type UserRole = 'SUPER_ADMIN' | 'ADMIN_MATRIZ' | 'GERENTE_FILIAL' | 'ATENDENTE' | 'PROFESSOR';

export type AlunoStatus = 'PRE_MATRICULA' | 'ATIVO' | 'INATIVO' | 'LISTA_ESPERA' | 'TRANSFERIDO';

export type Turno = 'INTEGRAL' | 'MEIO_TURNO';

export type MatriculaStatus = 'ATIVA' | 'ENCERRADA' | 'CANCELADA';

export type MensalidadeStatus = 'PENDENTE' | 'PAGO' | 'INADIMPLENTE' | 'CANCELADA';

export type TransacaoTipo = 'ENTRADA' | 'SAIDA';

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
}

export interface ApiError {
  error: string;
  message: string;
  details?: unknown[];
}
