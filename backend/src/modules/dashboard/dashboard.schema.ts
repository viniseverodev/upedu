// Schemas Zod para dashboard — S030/S031

import { z } from 'zod';

export const kpisQuerySchema = z.object({
  mes: z.string().regex(/^\d{1,2}$/).transform(Number).optional(),
  ano: z.string().regex(/^\d{4}$/).transform(Number).optional(),
});

// S031 — Comparativo entre filiais (ADMIN_MATRIZ / SUPER_ADMIN)
export const comparativoQuerySchema = z.object({
  mes: z.string().regex(/^\d{1,2}$/).transform(Number).optional(),
  ano: z.string().regex(/^\d{4}$/).transform(Number).optional(),
});
