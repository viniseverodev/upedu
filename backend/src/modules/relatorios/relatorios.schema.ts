// Schemas Zod para relatorios — TODO: implementar em STORY-025 (Sprint 6)
import { z } from 'zod';

export const createRelatoriosSchema = z.object({
  // TODO: definir campos em STORY-025 (Sprint 6)
});

export const updateRelatoriosSchema = createRelatoriosSchema.partial();

export type CreateRelatoriosInput = z.infer<typeof createRelatoriosSchema>;
export type UpdateRelatoriosInput = z.infer<typeof updateRelatoriosSchema>;
