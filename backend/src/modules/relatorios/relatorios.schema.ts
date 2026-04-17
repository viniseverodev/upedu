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

export const inadimplenciaQuerySchema = z.object({
  mes: mesSchema,
  ano: anoSchema,
});

export const fluxoCaixaQuerySchema = z.object({
  mes: mesSchema,
  ano: anoSchema,
  format: z.enum(['json', 'csv']).optional().default('json'),
});
