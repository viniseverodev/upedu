// Schemas Zod para relatórios — S025/S028

import { z } from 'zod';

// BUG-012: mes validado no range 1-12 para evitar Date wrap silencioso (ex: mes=0 → dez ano anterior)
const mesSchema = z
  .string()
  .regex(/^\d{1,2}$/)
  .transform(Number)
  .refine((n) => n >= 1 && n <= 12, { message: 'Mês deve ser entre 1 e 12' });

const anoSchema = z
  .string()
  .regex(/^\d{4}$/)
  .transform(Number)
  .refine((n) => n >= 2020, { message: 'Ano deve ser >= 2020' });

// M2: paginação para evitar queries ilimitadas em filiais com muitos inadimplentes
export const inadimplenciaQuerySchema = z.object({
  mes: mesSchema,
  ano: anoSchema,
  page: z.string().regex(/^\d+$/).transform(Number).refine((n) => n >= 1, 'page >= 1').optional().default('1'),
  pageSize: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .refine((n) => n >= 1 && n <= 200, 'pageSize entre 1 e 200')
    .optional()
    .default('100'),
});

export const fluxoCaixaQuerySchema = z.object({
  mes: mesSchema,
  ano: anoSchema,
  format: z.enum(['json', 'csv']).optional().default('json'),
});
