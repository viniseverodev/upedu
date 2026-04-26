// Schemas Zod para categorias financeiras — S027

import { z } from 'zod';

export const createCategoriaSchema = z.object({
  nome: z.string().min(2, 'Nome é obrigatório'),
  tipo: z.enum(['RECEITA', 'DESPESA']),
});

export const updateCategoriaSchema = z.object({
  nome: z.string().min(2, 'Nome é obrigatório').optional(),
  tipo: z.enum(['RECEITA', 'DESPESA']).optional(),
}).refine((d) => d.nome || d.tipo, 'Informe ao menos um campo para atualizar');

export type CreateCategoriaInput = z.infer<typeof createCategoriaSchema>;
export type UpdateCategoriaInput = z.infer<typeof updateCategoriaSchema>;
