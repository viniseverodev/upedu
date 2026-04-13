// Schemas Zod para dashboard — S030

import { z } from 'zod';

export const kpisQuerySchema = z.object({
  mes: z.string().regex(/^\d{1,2}$/).transform(Number).optional(),
  ano: z.string().regex(/^\d{4}$/).transform(Number).optional(),
});
