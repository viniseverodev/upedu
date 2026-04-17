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

export const kpisQuerySchema = z.object({
  mes: mesOptional,
  ano: anoOptional,
});

// S031 — Comparativo entre filiais (ADMIN_MATRIZ / SUPER_ADMIN)
export const comparativoQuerySchema = z.object({
  mes: mesOptional,
  ano: anoOptional,
});
