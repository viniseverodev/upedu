// Schemas Zod para categorias financeiras — S027

import { z } from 'zod';

export const createCategoriaSchema = z.object({
  nome: z.string().min(2, 'Nome é obrigatório'),
  tipo: z.enum(['RECEITA', 'DESPESA']),
});

export type CreateCategoriaInput = z.infer<typeof createCategoriaSchema>;
