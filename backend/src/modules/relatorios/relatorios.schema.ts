// Schemas Zod para relatórios — S025/S028

import { z } from 'zod';

export const inadimplenciaQuerySchema = z.object({
  mes: z.string().regex(/^\d{1,2}$/).transform(Number),
  ano: z.string().regex(/^\d{4}$/).transform(Number),
});

export const fluxoCaixaQuerySchema = z.object({
  mes: z.string().regex(/^\d{1,2}$/).transform(Number),
  ano: z.string().regex(/^\d{4}$/).transform(Number),
  format: z.enum(['json', 'csv']).optional().default('json'),
});
