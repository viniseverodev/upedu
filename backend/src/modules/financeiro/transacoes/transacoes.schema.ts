// Schemas Zod para transações financeiras — S027

import { z } from 'zod';

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (YYYY-MM-DD)')
  .refine((val) => {
    const [y, m, d] = val.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
  }, 'Data não existe no calendário');

export const createTransacaoSchema = z.object({
  categoriaId: z.string().uuid('ID da categoria inválido'),
  tipo: z.enum(['ENTRADA', 'SAIDA']),
  descricao: z.string().min(3, 'Descrição é obrigatória'),
  valor: z.number().positive('Valor deve ser positivo'),
  dataTransacao: dateField,
});

export const updateTransacaoSchema = z.object({
  categoriaId: z.string().uuid().optional(),
  tipo: z.enum(['ENTRADA', 'SAIDA']).optional(),
  descricao: z.string().min(3).optional(),
  valor: z.number().positive().optional(),
  dataTransacao: dateField.optional(),
}).refine((d) => Object.keys(d).length > 0, 'Informe ao menos um campo para atualizar');

export const bulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'Selecione ao menos uma transação'),
});

export const bulkUpdateSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'Selecione ao menos uma transação'),
  categoriaId: z.string().uuid().optional(),
  tipo: z.enum(['ENTRADA', 'SAIDA']).optional(),
  dataTransacao: dateField.optional(),
}).refine((d) => d.categoriaId || d.tipo || d.dataTransacao, 'Informe ao menos um campo para atualizar');

export type CreateTransacaoInput = z.infer<typeof createTransacaoSchema>;
export type UpdateTransacaoInput = z.infer<typeof updateTransacaoSchema>;
export type BulkDeleteInput = z.infer<typeof bulkDeleteSchema>;
export type BulkUpdateInput = z.infer<typeof bulkUpdateSchema>;
