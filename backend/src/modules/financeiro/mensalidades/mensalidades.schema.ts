// Schemas Zod para mensalidades — S022/S023/S024

import { z } from 'zod';

// S022 — Criar mensalidade
export const createMensalidadeSchema = z.object({
  alunoId: z.string().uuid('ID do aluno inválido'),
  mesReferencia: z.number().int().min(1).max(12),
  anoReferencia: z.number().int().min(2020),
});

// S023 — Registrar pagamento (suporta múltiplas formas e pagamento parcial)
const splitPagamentoSchema = z.object({
  formaPagamento: z.string().min(1, 'Forma de pagamento obrigatória'),
  valor: z.number().positive('Valor deve ser positivo'),
});

export const pagarMensalidadeSchema = z.object({
  splits: z.array(splitPagamentoSchema).min(1, 'Informe ao menos uma forma de pagamento'),
  dataPagamento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (YYYY-MM-DD)')
    .refine((val) => {
      const [y, m, d] = val.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
    }, 'Data não existe no calendário'),
  valorDesconto: z.number().min(0).default(0),
});

// S024 — Cancelar mensalidade
export const cancelarMensalidadeSchema = z.object({
  motivoCancelamento: z.string().min(3, 'Motivo de cancelamento é obrigatório'),
});

// Estornar pagamento
export const estornarMensalidadeSchema = z.object({
  motivoEstorno: z.string().min(3, 'Motivo do estorno é obrigatório'),
});

// Ações em lote
export const bulkPagarSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'Selecione ao menos uma mensalidade'),
  formaPagamento: z.string().min(1, 'Forma de pagamento é obrigatória'),
  dataPagamento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  valorDesconto: z.number().min(0).default(0),
});

export const bulkCancelarSchema = z.object({
  items: z.array(z.object({
    id: z.string().uuid(),
    motivoCancelamento: z.string().min(3, 'Motivo obrigatório'),
  })).min(1, 'Selecione ao menos uma mensalidade'),
});

export const bulkEstornarSchema = z.object({
  items: z.array(z.object({
    id: z.string().uuid(),
    motivoEstorno: z.string().min(3, 'Motivo obrigatório'),
  })).min(1, 'Selecione ao menos uma mensalidade'),
});

export type CreateMensalidadeInput = z.infer<typeof createMensalidadeSchema>;
export type PagarMensalidadeInput = z.infer<typeof pagarMensalidadeSchema>;
export type CancelarMensalidadeInput = z.infer<typeof cancelarMensalidadeSchema>;
export type EstornarMensalidadeInput = z.infer<typeof estornarMensalidadeSchema>;
export type BulkPagarInput = z.infer<typeof bulkPagarSchema>;
export type BulkCancelarInput = z.infer<typeof bulkCancelarSchema>;
export type BulkEstornarInput = z.infer<typeof bulkEstornarSchema>;
