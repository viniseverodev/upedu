// Schemas Zod para auditoria — S035
// GET /auditoria — filtros, paginação e exportação CSV

import { z } from 'zod';

export const auditQuerySchema = z.object({
  userId:     z.string().uuid().optional(),
  entityType: z.string().optional(),
  dateFrom:   z.string().date().optional(),
  dateTo:     z.string().date().optional(),
  // BUG-018: page sem limite superior → OFFSET gigante no banco; min=1 para evitar skip negativo
  page: z.string().regex(/^\d+$/).transform(Number)
    .refine((n) => n >= 1 && n <= 1000, { message: 'Página deve estar entre 1 e 1000' })
    .default('1'),
  format:     z.enum(['json', 'csv']).default('json'),
});

export type AuditQueryInput = z.infer<typeof auditQuerySchema>;
