// Schemas Zod para auditoria — S035
// GET /auditoria — filtros, paginação e exportação CSV

import { z } from 'zod';

export const auditQuerySchema = z.object({
  userId:     z.string().uuid().optional(),
  entityType: z.string().optional(),
  dateFrom:   z.string().date().optional(),
  dateTo:     z.string().date().optional(),
  page:       z.string().regex(/^\d+$/).transform(Number).default('1'),
  format:     z.enum(['json', 'csv']).default('json'),
});

export type AuditQueryInput = z.infer<typeof auditQuerySchema>;
