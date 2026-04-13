// Schemas Zod para transações financeiras — S027

import { z } from 'zod';

export const createTransacaoSchema = z.object({
  categoriaId: z.string().uuid('ID da categoria inválido'),
  tipo: z.enum(['ENTRADA', 'SAIDA']),
  descricao: z.string().min(3, 'Descrição é obrigatória'),
  valor: z.number().positive('Valor deve ser positivo'),
  dataTransacao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (YYYY-MM-DD)'),
});

export type CreateTransacaoInput = z.infer<typeof createTransacaoSchema>;
