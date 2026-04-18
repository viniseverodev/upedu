// Schemas Zod para dashboard — S030/S031

import { z } from 'zod';

// BUG-012: mes/ano validados com range para evitar Date wrap silencioso
const mesOptional = z
  .string()
  .regex(/^\d{1,2}$/)
  .transform(Number)
  .refine((n) => n >= 1 && n <= 12, { message: 'Mês deve ser entre 1 e 12' })
  .optional();

const anoOptional = z
  .string()
  .regex(/^\d{4}$/)
  .transform(Number)
  .refine((n) => n >= 2020, { message: 'Ano deve ser >= 2020' })
  .optional();

const dataOptional = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado: YYYY-MM-DD')
  .optional();

export const kpisQuerySchema = z.object({
  mes: mesOptional,
  ano: anoOptional,
  dataInicio: dataOptional,
  dataFim: dataOptional,
});

export const evolucaoQuerySchema = z.object({
  meses: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .refine((n) => n >= 1 && n <= 24, { message: 'meses deve ser entre 1 e 24' })
    .optional(),
});

// S031 — Comparativo entre filiais (ADMIN_MATRIZ / SUPER_ADMIN)
export const comparativoQuerySchema = z.object({
  mes: mesOptional,
  ano: anoOptional,
  dataInicio: dataOptional,
  dataFim: dataOptional,
});
