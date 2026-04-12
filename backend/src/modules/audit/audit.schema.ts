// Schemas Zod para audit — TODO: implementar em STORY-034 (Sprint 3)
import { z } from 'zod';

export const createAuditSchema = z.object({
  // TODO: definir campos em STORY-034 (Sprint 3)
});

export const updateAuditSchema = createAuditSchema.partial();

export type CreateAuditInput = z.infer<typeof createAuditSchema>;
export type UpdateAuditInput = z.infer<typeof updateAuditSchema>;
