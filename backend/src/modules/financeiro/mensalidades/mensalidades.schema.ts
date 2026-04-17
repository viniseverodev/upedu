// Schemas Zod para mensalidades — S022/S023/S024

import { z } from 'zod';

// S022 — Criar mensalidade
export const createMensalidadeSchema = z.object({
  alunoId: z.string().uuid('ID do aluno inválido'),
  mesReferencia: z.number().int().min(1).max(12),
  anoReferencia: z.number().int().min(2020),
});

// S023 — Registrar pagamento
export const pagarMensalidadeSchema = z.object({
  valorPago: z.number().positive('Valor pago deve ser positivo'),
  formaPagamento: z.string().min(1, 'Forma de pagamento é obrigatória'),
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

export type CreateMensalidadeInput = z.infer<typeof createMensalidadeSchema>;
export type PagarMensalidadeInput = z.infer<typeof pagarMensalidadeSchema>;
export type CancelarMensalidadeInput = z.infer<typeof cancelarMensalidadeSchema>;
